import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import { NOMBRE_MAX, TEXTO_TARJETA_MAX } from '../config/limites.js'
import { conectarDBDeTest, limpiarDB, desconectarDBDeTest } from './helpers/db.js'
import { api, auth, registrarYLoguear, USUARIO_DE_PRUEBA } from './helpers/api.js'

beforeAll(conectarDBDeTest)
afterEach(limpiarDB)
afterAll(desconectarDBDeTest)

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

const registrar = (datos: Partial<typeof USUARIO_DE_PRUEBA>) =>
    api().post('/api/usuarios/registro').send({ ...USUARIO_DE_PRUEBA, ...datos })

describe('validación del registro', () => {

    it.each([
        ['una contraseña corta', { password: 'corta' }, /al menos 8/],
        ['una contraseña de más de 72 bytes', { password: 'ñ'.repeat(40) }, /demasiado larga/],
        ['un email sin formato de email', { email: 'x@x' }, /email no es válido/],
        ['un email que no es texto plano', { email: 'a b@example.com' }, /email no es válido/],
        ['un nombre de más de 50 caracteres', { nombre: 'a'.repeat(51) }, /50 caracteres/],
    ])('rechaza %s', async (_, datos, mensaje) => {
        const res = await registrar(datos)
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(mensaje)
    })

    it('acepta una contraseña de 8 caracteres', async () => {
        await registrar({ password: '12345678' }).expect(201)
    })
})

describe('errores y cabeceras', () => {

    it('un JSON mal formado responde 400 en JSON, sin stack trace', async () => {
        const res = await api().post('/api/usuarios/login').set('Content-Type', 'application/json').send('{"email":')

        expect(res.status).toBe(400)
        expect(res.headers['content-type']).toMatch(/json/)
        expect(res.body).toEqual({ ok: false, message: 'El cuerpo de la petición no es un JSON válido.' })
        expect(res.text).not.toMatch(/node_modules|at /)
    })

    it('un cuerpo de más de 1 MB responde 413 en JSON', async () => {
        const res = await api().post('/api/usuarios/login').send({ email: 'x@example.com', password: 'a'.repeat(1_100_000) })

        expect(res.status).toBe(413)
        expect(res.body.ok).toBe(false)
    })

    it('una ruta inexistente responde 404 en JSON', async () => {
        const res = await api().get('/api/no-existe')
        expect(res.status).toBe(404)
        expect(res.body).toEqual({ ok: false, message: 'Ruta no encontrada' })
    })

    it('no anuncia Express y envía las cabeceras de seguridad', async () => {
        const res = await api().get('/health')
        expect(res.headers['x-powered-by']).toBeUndefined()
        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(res.headers['strict-transport-security']).toBeDefined()
        expect(res.headers['content-security-policy']).toBeDefined()
    })
})

describe('tokens', () => {

    it('rechaza un token firmado con otro algoritmo', async () => {
        const token = jwt.sign({ id: 'x', email: 'x@example.com' }, env.jwtSecret, { algorithm: 'HS512' })
        await api().get('/api/asignaturas').set(auth(token)).expect(401)
    })
})

describe('límites de tamaño', () => {

    let token: string
    beforeEach(async () => { token = await registrarYLoguear() })

    it('rechaza nombres de asignatura y tema demasiado largos', async () => {
        const largo = 'a'.repeat(NOMBRE_MAX + 1)

        const res = await api().post('/api/asignaturas').set(auth(token)).send({ nombre: largo })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(new RegExp(`${NOMBRE_MAX} caracteres`))

        const { body: asignatura } = await api().post('/api/asignaturas').set(auth(token)).send({ nombre: 'Inglés' }).expect(201)
        await api().post(`/api/asignaturas/${asignatura._id}/temas`).set(auth(token)).send({ nombre: largo }).expect(400)
        await api().patch(`/api/asignaturas/${asignatura._id}`).set(auth(token)).send({ nombre: largo }).expect(400)
    })

    it('rechaza textos de tarjeta demasiado largos, al crear y al editar', async () => {
        const { body: asignatura } = await api().post('/api/asignaturas').set(auth(token)).send({ nombre: 'Inglés' })
        const { body: tema } = await api().post(`/api/asignaturas/${asignatura._id}/temas`).set(auth(token)).send({ nombre: 'Verbos' })
        const largo = 'a'.repeat(TEXTO_TARJETA_MAX + 1)

        await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: largo, respuesta: 'x' }).expect(400)

        const { body: tarjeta } = await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token))
            .send({ pregunta: 'a'.repeat(TEXTO_TARJETA_MAX), respuesta: 'x' }).expect(201)
        await api().patch(`/api/tarjetas/${tarjeta._id}`).set(auth(token)).send({ pregunta: 'x', respuesta: largo }).expect(400)
    })
})
