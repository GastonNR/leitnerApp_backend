import { describe, it, expect, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import { responderError } from '../utils/responderError.js'
import { AppError } from '../types/AppError.js'
import env from '../config/env.js'

function respuestaFalsa() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) { this.statusCode = code; return this },
        json(body: unknown) { this.body = body; return this },
    }
    return res
}

function ejecutar(authorization?: string) {
    const req = { headers: authorization ? { authorization } : {} } as Request
    const res = respuestaFalsa()
    const next = jest.fn() as unknown as NextFunction
    verificarToken(req, res as unknown as Response, next)
    return { req, res, next: next as unknown as jest.Mock }
}

describe('verificarToken', () => {

    it('deja pasar un token válido y pone el payload en req.usuario', () => {
        const token = jwt.sign({ id: 'abc', email: 'a@b.com' }, env.jwtSecret, { expiresIn: '1h' })

        const { req, res, next } = ejecutar(`Bearer ${token}`)

        expect(next).toHaveBeenCalledTimes(1)
        expect(res.statusCode).toBe(0)
        expect(req.usuario).toMatchObject({ id: 'abc', email: 'a@b.com' })
    })

    it.each([
        ['sin cabecera', undefined],
        ['sin token', 'Bearer'],
        ['con otro esquema', 'Basic abc'],
        ['con "Bearer" pegado al token', 'Bearerabc.def.ghi'],
    ])('responde 401 %s', (_desc, cabecera) => {
        const { res, next } = ejecutar(cabecera)

        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({ ok: false, message: 'Token no proporcionado' })
    })

    it('responde 401 con un token expirado', () => {
        const token = jwt.sign({ id: 'abc' }, env.jwtSecret, { expiresIn: -10 })

        const { res, next } = ejecutar(`Bearer ${token}`)

        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(401)
        expect(res.body).toEqual({ ok: false, message: 'Token inválido o expirado' })
    })

    it('responde 401 con un token firmado con otro secreto', () => {
        const token = jwt.sign({ id: 'abc' }, 'otro-secreto')

        const { res, next } = ejecutar(`Bearer ${token}`)

        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(401)
    })
})

describe('responderError', () => {

    it('usa el status y el mensaje de un AppError', () => {
        const res = respuestaFalsa()

        responderError(res as unknown as Response, new AppError('No existe', 404), 'genérico')

        expect(res.statusCode).toBe(404)
        expect(res.body).toEqual({ ok: false, message: 'No existe' })
    })

    it('responde 500 con el mensaje por defecto ante cualquier otro error, sin filtrar el original', () => {
        const res = respuestaFalsa()
        const consola = jest.spyOn(console, 'error').mockImplementation(() => {})

        responderError(res as unknown as Response, new Error('detalle interno'), 'Error genérico')

        expect(res.statusCode).toBe(500)
        expect(res.body).toEqual({ ok: false, message: 'Error genérico' })
        consola.mockRestore()
    })
})
