import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals'
import { Types } from 'mongoose'
import Usuario from '../models/Usuarios.js'
import { conectarDBDeTest, limpiarDB, desconectarDBDeTest } from './helpers/db.js'
import { api, auth, registrarYLoguear } from './helpers/api.js'

beforeAll(conectarDBDeTest)
afterEach(limpiarDB)
afterAll(desconectarDBDeTest)

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

const idInexistente = () => new Types.ObjectId().toString()

const fechaLocal = (fecha: string | Date) => new Date(fecha).toLocaleDateString('sv-SE')
function enDias(dias: number): string {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + dias)
    return fechaLocal(fecha)
}

let token: string

beforeEach(async () => {
    token = await registrarYLoguear()
})

async function crearLeccion(nombre = 'Inglés') {
    const res = await api().post('/api/lecciones/leccion').set(auth(token)).send({ nuevaLeccion: nombre })
    expect(res.status).toBe(201)
    return res.body.nuevaLeccion
}

async function crearTarjeta(leccionId: string, pregunta = 'dog', respuesta = 'perro') {
    const res = await api().post(`/api/lecciones/leccion/${leccionId}`).set(auth(token)).send({ pregunta, respuesta })
    expect(res.status).toBe(201)
    return res.body
}

async function leccionesActuales() {
    const res = await api().get('/api/lecciones').set(auth(token)).expect(200)
    return res.body
}

describe('autenticación de /api/lecciones', () => {

    it.each([
        ['get', '/api/lecciones'],
        ['post', '/api/lecciones/leccion'],
        ['put', '/api/lecciones/leccion'],
        ['delete', `/api/lecciones/${new Types.ObjectId()}`],
        ['post', `/api/lecciones/leccion/${new Types.ObjectId()}`],
        ['delete', `/api/lecciones/leccion/${new Types.ObjectId()}`],
    ] as Array<['get' | 'post' | 'put' | 'delete', string]>)('%s %s exige token', async (metodo, ruta) => {
        const res = await api()[metodo](ruta)
        expect(res.status).toBe(401)
    })

    it('responde 404 si el usuario del token ya no existe', async () => {
        await Usuario.deleteMany({})

        const res = await api().get('/api/lecciones').set(auth(token))

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ ok: false, message: 'Usuario no encontrado' })
    })
})

describe('lecciones', () => {

    it('un usuario nuevo no tiene lecciones', async () => {
        expect(await leccionesActuales()).toEqual([])
    })

    it('crea una lección con 5 cajas vacías y nombre recortado', async () => {
        const leccion = await crearLeccion('  Biología  ')

        expect(leccion.nombre).toBe('Biología')
        expect(leccion._id).toEqual(expect.any(String))
        expect(leccion.fechaCreacion).toEqual(expect.any(String))
        expect(leccion.cajas.map((c: { nombre: string }) => c.nombre))
            .toEqual(['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4', 'Caja 5'])
        expect(leccion.cajas.every((c: { tarjetas: unknown[] }) => c.tarjetas.length === 0)).toBe(true)
        expect(await leccionesActuales()).toHaveLength(1)
    })

    it('responde 409 con un nombre repetido, sin importar mayúsculas', async () => {
        await crearLeccion('Inglés')

        const res = await api().post('/api/lecciones/leccion').set(auth(token)).send({ nuevaLeccion: 'INGLÉS ' })

        expect(res.status).toBe(409)
        expect(res.body.message).toBe('Ya existe una lección con ese nombre')
    })

    it.each([
        ['vacío', ''],
        ['solo espacios', '   '],
        ['no string', 123],
    ])('responde 400 con un nombre %s', async (_desc, nombre) => {
        const res = await api().post('/api/lecciones/leccion').set(auth(token)).send({ nuevaLeccion: nombre })
        expect(res.status).toBe(400)
    })

    it('elimina una lección', async () => {
        const leccion = await crearLeccion()

        const res = await api().delete(`/api/lecciones/${leccion._id}`).set(auth(token))

        expect(res.status).toBe(200)
        expect(res.body.ok).toBe(true)
        expect(await leccionesActuales()).toEqual([])
    })

    it('responde 404 al eliminar una lección inexistente y 400 con un id mal formado', async () => {
        await api().delete(`/api/lecciones/${idInexistente()}`).set(auth(token)).expect(404)
        await api().delete('/api/lecciones/no-es-un-id').set(auth(token)).expect(400)
    })

    it('un usuario no puede ver ni borrar las lecciones de otro', async () => {
        const leccionAjena = await crearLeccion('Privada')
        const tokenOtro = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave' })

        const listado = await api().get('/api/lecciones').set(auth(tokenOtro)).expect(200)
        expect(listado.body).toEqual([])

        await api().delete(`/api/lecciones/${leccionAjena._id}`).set(auth(tokenOtro)).expect(404)
        expect(await leccionesActuales()).toHaveLength(1)
    })
})

describe('tarjetas', () => {

    it('crea una tarjeta en la caja 1, nivel 1, sin evaluar y con revisión mañana', async () => {
        const leccion = await crearLeccion()

        const tarjeta = await crearTarjeta(leccion._id, '  dog ', ' perro  ')

        expect(tarjeta).toMatchObject({ pregunta: 'dog', respuesta: 'perro', nivel: 1, es_correcta: null })
        expect(fechaLocal(tarjeta.proxima_revision)).toBe(enDias(1))

        const [guardada] = await leccionesActuales()
        expect(guardada.cajas[0].tarjetas).toHaveLength(1)
        expect(guardada.cajas[0].tarjetas[0]._id).toBe(tarjeta._id)
    })

    it('responde 400 si falta la pregunta o la respuesta', async () => {
        const leccion = await crearLeccion()

        await api().post(`/api/lecciones/leccion/${leccion._id}`).set(auth(token)).send({ pregunta: 'dog' }).expect(400)
        await api().post(`/api/lecciones/leccion/${leccion._id}`).set(auth(token)).send({ pregunta: ' ', respuesta: 'x' }).expect(400)
    })

    it('responde 404 en una lección inexistente y 400 con un id mal formado', async () => {
        const body = { pregunta: 'dog', respuesta: 'perro' }

        await api().post(`/api/lecciones/leccion/${idInexistente()}`).set(auth(token)).send(body).expect(404)
        await api().post('/api/lecciones/leccion/xyz').set(auth(token)).send(body).expect(400)
    })

    it('elimina una tarjeta de cualquier caja', async () => {
        const leccion = await crearLeccion()
        const t1 = await crearTarjeta(leccion._id, 'a', '1')
        const t2 = await crearTarjeta(leccion._id, 'b', '2')

        const res = await api().delete(`/api/lecciones/leccion/${t1._id}`).set(auth(token))

        expect(res.status).toBe(204)
        const [guardada] = await leccionesActuales()
        expect(guardada.cajas[0].tarjetas.map((t: { _id: string }) => t._id)).toEqual([t2._id])
    })

    it('responde 404 al eliminar una tarjeta inexistente y 400 con un id mal formado', async () => {
        await api().delete(`/api/lecciones/leccion/${idInexistente()}`).set(auth(token)).expect(404)
        await api().delete('/api/lecciones/leccion/xyz').set(auth(token)).expect(400)
    })

    it('un usuario no puede eliminar la tarjeta de otro', async () => {
        const leccion = await crearLeccion()
        const tarjeta = await crearTarjeta(leccion._id)
        const tokenOtro = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave' })

        await api().delete(`/api/lecciones/leccion/${tarjeta._id}`).set(auth(tokenOtro)).expect(404)

        const [guardada] = await leccionesActuales()
        expect(guardada.cajas[0].tarjetas).toHaveLength(1)
    })
})

describe('PUT /api/lecciones/leccion (guardar sesión de estudio)', () => {

    it('aplica el algoritmo Leitner y persiste el resultado', async () => {
        const leccion = await crearLeccion()
        const acertada = await crearTarjeta(leccion._id, 'acierto', 'a')
        const fallada = await crearTarjeta(leccion._id, 'fallo', 'f')
        const sinEvaluar = await crearTarjeta(leccion._id, 'pendiente', 'p')

        // Sesión hecha en el cliente: marca dos tarjetas y deja una sin evaluar.
        const [actual] = await leccionesActuales()
        actual.cajas[0].tarjetas = actual.cajas[0].tarjetas.map((t: { _id: string }) => ({
            ...t,
            es_correcta: t._id === acertada._id ? true : t._id === fallada._id ? false : null,
        }))

        const res = await api().put('/api/lecciones/leccion').set(auth(token))
            .send({ _id: actual._id, nombre: actual.nombre, cajas: actual.cajas })

        expect(res.status).toBe(200)
        expect(res.body._id).toBe(leccion._id)

        const [guardada] = await leccionesActuales()
        const ids = (caja: number) => guardada.cajas[caja].tarjetas.map((t: { _id: string }) => t._id).sort()

        expect(ids(0)).toEqual([fallada._id, sinEvaluar._id].sort())
        expect(ids(1)).toEqual([acertada._id])

        const movida = guardada.cajas[1].tarjetas[0]
        expect(movida.nivel).toBe(2)
        expect(movida.es_correcta).toBeNull()
        expect(fechaLocal(movida.proxima_revision)).toBe(enDias(3))

        const t = guardada.cajas[0].tarjetas.find((x: { _id: string }) => x._id === fallada._id)
        expect(t.nivel).toBe(1)
        expect(t.es_correcta).toBeNull()
        expect(fechaLocal(t.proxima_revision)).toBe(enDias(1))
    })

    it('conserva los _id de las tarjetas tras guardar (se pueden seguir borrando)', async () => {
        const leccion = await crearLeccion()
        const tarjeta = await crearTarjeta(leccion._id)
        const [actual] = await leccionesActuales()
        actual.cajas[0].tarjetas[0].es_correcta = true

        await api().put('/api/lecciones/leccion').set(auth(token)).send(actual).expect(200)
        await api().delete(`/api/lecciones/leccion/${tarjeta._id}`).set(auth(token)).expect(204)

        const [guardada] = await leccionesActuales()
        expect(guardada.cajas.flatMap((c: { tarjetas: unknown[] }) => c.tarjetas)).toHaveLength(0)
    })

    it('responde 400 si no llegan exactamente 5 cajas', async () => {
        const leccion = await crearLeccion()

        const res = await api().put('/api/lecciones/leccion').set(auth(token))
            .send({ _id: leccion._id, cajas: leccion.cajas.slice(0, 4) })

        expect(res.status).toBe(400)
        expect(res.body.message).toBe('Se esperan exactamente 5 cajas')
    })

    it('responde 400 con un _id mal formado y 404 con una lección inexistente', async () => {
        const leccion = await crearLeccion()

        await api().put('/api/lecciones/leccion').set(auth(token)).send({ _id: 'xyz', cajas: leccion.cajas }).expect(400)
        await api().put('/api/lecciones/leccion').set(auth(token)).send({ _id: idInexistente(), cajas: leccion.cajas }).expect(404)
    })

    it('un usuario no puede sobrescribir la lección de otro', async () => {
        const leccion = await crearLeccion()
        await crearTarjeta(leccion._id)
        const tokenOtro = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave' })

        const cajasVacias = leccion.cajas
        await api().put('/api/lecciones/leccion').set(auth(tokenOtro)).send({ _id: leccion._id, cajas: cajasVacias }).expect(404)

        const [guardada] = await leccionesActuales()
        expect(guardada.cajas[0].tarjetas).toHaveLength(1)
    })
})
