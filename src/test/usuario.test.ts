import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Usuario from '../models/Usuarios.js'
import env from '../config/env.js'
import { conectarDBDeTest, limpiarDB, desconectarDBDeTest } from './helpers/db.js'
import { api, USUARIO_DE_PRUEBA } from './helpers/api.js'

beforeAll(conectarDBDeTest)
afterEach(limpiarDB)
afterAll(desconectarDBDeTest)

// Silencia el logger de peticiones de app.ts y los console.error esperados.
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/usuarios/registro', () => {

    it('registra un usuario y guarda la contraseña hasheada', async () => {
        const res = await api().post('/api/usuarios/registro').send(USUARIO_DE_PRUEBA)

        expect(res.status).toBe(201)
        expect(res.body).toEqual({ ok: true, message: 'Usuario registrado' })

        const guardado = await Usuario.findOne({ email: USUARIO_DE_PRUEBA.email })
        expect(guardado).not.toBeNull()
        expect(guardado!.password).not.toBe(USUARIO_DE_PRUEBA.password)
        expect(await bcrypt.compare(USUARIO_DE_PRUEBA.password, guardado!.password)).toBe(true)
        expect(guardado!.lecciones).toHaveLength(0)
    })

    it('normaliza el email (espacios y mayúsculas)', async () => {
        await api().post('/api/usuarios/registro')
            .send({ ...USUARIO_DE_PRUEBA, email: '  Tester@Example.COM ' })
            .expect(201)

        const guardado = await Usuario.findOne({}).lean()
        expect(guardado!.email).toBe('tester@example.com')
    })

    it('responde 409 si el email ya existe, aunque cambien las mayúsculas', async () => {
        await api().post('/api/usuarios/registro').send(USUARIO_DE_PRUEBA).expect(201)

        const res = await api().post('/api/usuarios/registro')
            .send({ ...USUARIO_DE_PRUEBA, email: 'TESTER@example.com' })

        expect(res.status).toBe(409)
        expect(res.body).toEqual({ ok: false, message: 'El usuario ya existe.' })
        expect(await Usuario.countDocuments()).toBe(1)
    })

    it.each(['nombre', 'email', 'password'])('responde 400 si falta %s', async (campo) => {
        const datos: Record<string, string> = { ...USUARIO_DE_PRUEBA }
        delete datos[campo]

        const res = await api().post('/api/usuarios/registro').send(datos)

        expect(res.status).toBe(400)
        expect(res.body.ok).toBe(false)
        expect(await Usuario.countDocuments()).toBe(0)
    })

    it('responde 400 si un campo es solo espacios', async () => {
        const res = await api().post('/api/usuarios/registro').send({ ...USUARIO_DE_PRUEBA, nombre: '   ' })

        expect(res.status).toBe(400)
    })
})

describe('POST /api/usuarios/login', () => {

    async function registrar() {
        await api().post('/api/usuarios/registro').send(USUARIO_DE_PRUEBA).expect(201)
    }

    it('devuelve 200 con un JWT válido y los datos públicos del usuario', async () => {
        await registrar()

        const res = await api().post('/api/usuarios/login')
            .send({ email: USUARIO_DE_PRUEBA.email, password: USUARIO_DE_PRUEBA.password })

        expect(res.status).toBe(200)
        expect(res.body.ok).toBe(true)
        expect(res.body.usuario).toEqual({ id: expect.any(String), nombre: USUARIO_DE_PRUEBA.nombre })
        expect(res.body.usuario).not.toHaveProperty('password')

        const payload = jwt.verify(res.body.token, env.jwtSecret) as jwt.JwtPayload
        expect(payload).toMatchObject({ id: res.body.usuario.id, email: USUARIO_DE_PRUEBA.email })
        expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60)
    })

    it('acepta el email con otras mayúsculas', async () => {
        await registrar()

        const res = await api().post('/api/usuarios/login')
            .send({ email: 'Tester@EXAMPLE.com', password: USUARIO_DE_PRUEBA.password })

        expect(res.status).toBe(200)
    })

    it('responde 401 con el mismo mensaje para contraseña incorrecta y email inexistente', async () => {
        await registrar()

        const passMal = await api().post('/api/usuarios/login')
            .send({ email: USUARIO_DE_PRUEBA.email, password: 'incorrecta' })
        const emailMal = await api().post('/api/usuarios/login')
            .send({ email: 'nadie@example.com', password: USUARIO_DE_PRUEBA.password })

        expect(passMal.status).toBe(401)
        expect(emailMal.status).toBe(401)
        expect(passMal.body).toEqual(emailMal.body)
        expect(passMal.body).toEqual({ ok: false, message: 'Email o contraseña incorrectos' })
    })

    it('responde 400 si faltan credenciales', async () => {
        const res = await api().post('/api/usuarios/login').send({ email: USUARIO_DE_PRUEBA.email })

        expect(res.status).toBe(400)
    })
})

describe('logger de peticiones', () => {

    it('no imprime el body (no expone contraseñas)', async () => {
        const log = console.log as unknown as jest.Mock
        log.mockClear()

        await api().post('/api/usuarios/login')
            .send({ email: 'x@example.com', password: 'super-secreta' })

        const salida = JSON.stringify(log.mock.calls)
        expect(salida).toContain('POST /api/usuarios/login')
        expect(salida).not.toContain('super-secreta')
    })
})
