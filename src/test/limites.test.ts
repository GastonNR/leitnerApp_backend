import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Límites bajos y CORS restringido solo para este archivo. app.ts se importa después de fijarlos
// (los imports estáticos se evaluarían antes).
process.env.LIMITE_LOGIN = '3'
process.env.LIMITE_REGISTRO = '2'
process.env.CORS_ORIGIN = 'https://leitner.example.com'

const { default: request } = await import('supertest')
const { default: leitnerApp } = await import('../app.js')
const { conectarDBDeTest, desconectarDBDeTest } = await import('./helpers/db.js')

const api = () => request(leitnerApp)

beforeAll(conectarDBDeTest)
afterAll(desconectarDBDeTest)
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
})

const usuario = (n: number) => ({ nombre: `u${n}`, email: `u${n}@example.com`, password: 'clave-segura' })

describe('límite de intentos', () => {

    it('corta los registros masivos desde una misma IP', async () => {
        await api().post('/api/usuarios/registro').send(usuario(1)).expect(201)
        await api().post('/api/usuarios/registro').send(usuario(2)).expect(201)

        const res = await api().post('/api/usuarios/registro').send(usuario(3))
        expect(res.status).toBe(429)
        expect(res.body.ok).toBe(false)
        expect(res.body.message).toMatch(/demasiadas cuentas/i)
    })

    it('bloquea el login tras varios intentos fallidos, pero no cuenta los correctos', async () => {
        const { email, password } = usuario(1)

        // Los logins correctos no consumen intentos.
        for (let i = 0; i < 5; i++) await api().post('/api/usuarios/login').send({ email, password }).expect(200)

        for (let i = 0; i < 3; i++) await api().post('/api/usuarios/login').send({ email, password: 'mala-clave' }).expect(401)

        const bloqueado = await api().post('/api/usuarios/login').send({ email, password: 'otra-mala' })
        expect(bloqueado.status).toBe(429)
        expect(bloqueado.body.message).toMatch(/demasiados intentos/i)

        // Mientras dure el bloqueo, ni siquiera la contraseña correcta entra.
        await api().post('/api/usuarios/login').send({ email, password }).expect(429)
    })
})

describe('CORS', () => {

    it('solo autoriza al origen configurado', async () => {
        const propio = await api().get('/health').set('Origin', 'https://leitner.example.com')
        expect(propio.headers['access-control-allow-origin']).toBe('https://leitner.example.com')

        const ajeno = await api().get('/health').set('Origin', 'https://malicioso.example.com')
        expect(ajeno.headers['access-control-allow-origin']).toBeUndefined()
    })
})
