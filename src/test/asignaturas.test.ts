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

const otroUsuario = () => registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave' })

async function crearAsignatura(nombre = 'Inglés') {
    const res = await api().post('/api/asignaturas').set(auth(token)).send({ nombre })
    expect(res.status).toBe(201)
    return res.body
}

async function crearTema(asignaturaId: string, nombre = 'Verbos') {
    const res = await api().post(`/api/asignaturas/${asignaturaId}/temas`).set(auth(token)).send({ nombre })
    expect(res.status).toBe(201)
    return res.body
}

// Asignatura con un tema, lista para agregarle tarjetas.
async function crearTemaNuevo() {
    const asignatura = await crearAsignatura()
    return crearTema(asignatura._id)
}

async function crearTarjeta(temaId: string, pregunta = 'dog', respuesta = 'perro') {
    const res = await api().post(`/api/temas/${temaId}/tarjetas`).set(auth(token)).send({ pregunta, respuesta })
    expect(res.status).toBe(201)
    return res.body
}

async function asignaturasActuales(t = token) {
    const res = await api().get('/api/asignaturas').set(auth(t)).expect(200)
    return res.body
}

// El único tema del usuario (la mayoría de los tests usan uno solo).
async function temaActual() {
    const [asignatura] = await asignaturasActuales()
    return asignatura.temas[0]
}

describe('autenticación', () => {

    const id = () => new Types.ObjectId().toString()

    it.each([
        ['get', '/api/asignaturas'],
        ['post', '/api/asignaturas'],
        ['delete', `/api/asignaturas/${id()}`],
        ['post', `/api/asignaturas/${id()}/temas`],
        ['delete', `/api/temas/${id()}`],
        ['put', `/api/temas/${id()}/cajas`],
        ['post', `/api/temas/${id()}/tarjetas`],
        ['patch', `/api/tarjetas/${id()}`],
        ['delete', `/api/tarjetas/${id()}`],
    ] as Array<['get' | 'post' | 'put' | 'patch' | 'delete', string]>)('%s %s exige token', async (metodo, ruta) => {
        const res = await api()[metodo](ruta)
        expect(res.status).toBe(401)
    })

    it('responde 404 si el usuario del token ya no existe', async () => {
        await Usuario.deleteMany({})

        const res = await api().get('/api/asignaturas').set(auth(token))

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ ok: false, message: 'Usuario no encontrado' })
    })

    it('ignora las lecciones de la estructura anterior y no las borra al guardar', async () => {
        await Usuario.collection.updateOne({}, { $set: { lecciones: [{ nombre: 'Vieja', cajas: [] }] } })

        expect(await asignaturasActuales()).toEqual([])
        await crearAsignatura()

        const crudo = await Usuario.collection.findOne({})
        expect(crudo?.lecciones).toHaveLength(1)
    })
})

describe('asignaturas', () => {

    it('un usuario nuevo no tiene asignaturas', async () => {
        expect(await asignaturasActuales()).toEqual([])
    })

    it('crea una asignatura sin temas y con el nombre recortado', async () => {
        const asignatura = await crearAsignatura('  Biología  ')

        expect(asignatura).toMatchObject({ nombre: 'Biología', temas: [] })
        expect(asignatura._id).toEqual(expect.any(String))
        expect(asignatura.fechaCreacion).toEqual(expect.any(String))
        expect(await asignaturasActuales()).toHaveLength(1)
    })

    it('responde 409 con un nombre repetido, sin importar mayúsculas', async () => {
        await crearAsignatura('Inglés')

        const res = await api().post('/api/asignaturas').set(auth(token)).send({ nombre: 'INGLÉS ' })

        expect(res.status).toBe(409)
        expect(res.body.message).toBe('Ya existe una asignatura con ese nombre')
    })

    it.each([
        ['vacío', ''],
        ['solo espacios', '   '],
        ['no string', 123],
    ])('responde 400 con un nombre %s', async (_desc, nombre) => {
        await api().post('/api/asignaturas').set(auth(token)).send({ nombre }).expect(400)
    })

    it('elimina una asignatura con todos sus temas', async () => {
        const asignatura = await crearAsignatura()
        const tema = await crearTema(asignatura._id)
        await crearTarjeta(tema._id)

        await api().delete(`/api/asignaturas/${asignatura._id}`).set(auth(token)).expect(204)

        expect(await asignaturasActuales()).toEqual([])
    })

    it('responde 404 al eliminar una asignatura inexistente y 400 con un id mal formado', async () => {
        await api().delete(`/api/asignaturas/${idInexistente()}`).set(auth(token)).expect(404)
        await api().delete('/api/asignaturas/no-es-un-id').set(auth(token)).expect(400)
    })

    it('un usuario no puede ver ni borrar las asignaturas de otro', async () => {
        const ajena = await crearAsignatura('Privada')
        const tokenOtro = await otroUsuario()

        expect(await asignaturasActuales(tokenOtro)).toEqual([])
        await api().delete(`/api/asignaturas/${ajena._id}`).set(auth(tokenOtro)).expect(404)
        expect(await asignaturasActuales()).toHaveLength(1)
    })
})

describe('temas', () => {

    it('crea un tema con 5 cajas vacías dentro de la asignatura', async () => {
        const asignatura = await crearAsignatura()

        const tema = await crearTema(asignatura._id, '  Verbos irregulares ')

        expect(tema.nombre).toBe('Verbos irregulares')
        expect(tema.fechaCreacion).toEqual(expect.any(String))
        expect(tema.cajas.map((c: { nombre: string }) => c.nombre))
            .toEqual(['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4', 'Caja 5'])
        expect(tema.cajas.every((c: { tarjetas: unknown[] }) => c.tarjetas.length === 0)).toBe(true)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas.map((t: { _id: string }) => t._id)).toEqual([tema._id])
    })

    it('no repite nombres dentro de una asignatura, pero sí entre asignaturas', async () => {
        const ingles = await crearAsignatura('Inglés')
        const frances = await crearAsignatura('Francés')
        await crearTema(ingles._id, 'Verbos')

        const repetido = await api().post(`/api/asignaturas/${ingles._id}/temas`).set(auth(token)).send({ nombre: 'verbos' })
        expect(repetido.status).toBe(409)
        expect(repetido.body.message).toBe('Ya existe un tema con ese nombre en la asignatura')

        await crearTema(frances._id, 'Verbos')
    })

    it('responde 400 sin nombre, 404 en una asignatura inexistente y 400 con un id mal formado', async () => {
        const asignatura = await crearAsignatura()

        await api().post(`/api/asignaturas/${asignatura._id}/temas`).set(auth(token)).send({ nombre: ' ' }).expect(400)
        await api().post(`/api/asignaturas/${idInexistente()}/temas`).set(auth(token)).send({ nombre: 'x' }).expect(404)
        await api().post('/api/asignaturas/xyz/temas').set(auth(token)).send({ nombre: 'x' }).expect(400)
    })

    it('elimina un tema sin tocar los demás de la asignatura', async () => {
        const asignatura = await crearAsignatura()
        const borrar = await crearTema(asignatura._id, 'A')
        const queda = await crearTema(asignatura._id, 'B')

        await api().delete(`/api/temas/${borrar._id}`).set(auth(token)).expect(204)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas.map((t: { _id: string }) => t._id)).toEqual([queda._id])
    })

    it('responde 404 al eliminar un tema inexistente y 400 con un id mal formado', async () => {
        await api().delete(`/api/temas/${idInexistente()}`).set(auth(token)).expect(404)
        await api().delete('/api/temas/xyz').set(auth(token)).expect(400)
    })

    it('un usuario no puede crear temas en la asignatura de otro ni borrar sus temas', async () => {
        const asignatura = await crearAsignatura()
        const tema = await crearTema(asignatura._id)
        const tokenOtro = await otroUsuario()

        await api().post(`/api/asignaturas/${asignatura._id}/temas`).set(auth(tokenOtro)).send({ nombre: 'Intruso' }).expect(404)
        await api().delete(`/api/temas/${tema._id}`).set(auth(tokenOtro)).expect(404)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas).toHaveLength(1)
    })
})

describe('tarjetas', () => {

    it('crea una tarjeta en la caja 1 del tema, nivel 1, sin evaluar y con revisión mañana', async () => {
        const tema = await crearTemaNuevo()

        const tarjeta = await crearTarjeta(tema._id, '  dog ', ' perro  ')

        expect(tarjeta).toMatchObject({ pregunta: 'dog', respuesta: 'perro', nivel: 1, es_correcta: null })
        expect(fechaLocal(tarjeta.proxima_revision)).toBe(enDias(1))

        const guardado = await temaActual()
        expect(guardado.cajas[0].tarjetas.map((t: { _id: string }) => t._id)).toEqual([tarjeta._id])
    })

    it('la tarjeta queda en su tema y no en otros de la misma asignatura', async () => {
        const asignatura = await crearAsignatura()
        const a = await crearTema(asignatura._id, 'A')
        await crearTema(asignatura._id, 'B')

        await crearTarjeta(a._id)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas.map((t: { cajas: Array<{ tarjetas: unknown[] }> }) => t.cajas[0].tarjetas.length)).toEqual([1, 0])
    })

    it('responde 400 si falta la pregunta o la respuesta', async () => {
        const tema = await crearTemaNuevo()

        await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: 'dog' }).expect(400)
        await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: ' ', respuesta: 'x' }).expect(400)
    })

    it('responde 404 en un tema inexistente y 400 con un id mal formado', async () => {
        const body = { pregunta: 'dog', respuesta: 'perro' }

        await api().post(`/api/temas/${idInexistente()}/tarjetas`).set(auth(token)).send(body).expect(404)
        await api().post('/api/temas/xyz/tarjetas').set(auth(token)).send(body).expect(400)
    })

    it('elimina una tarjeta de cualquier tema', async () => {
        const asignatura = await crearAsignatura()
        await crearTema(asignatura._id, 'A')
        const b = await crearTema(asignatura._id, 'B')
        const t1 = await crearTarjeta(b._id, 'a', '1')
        const t2 = await crearTarjeta(b._id, 'b', '2')

        await api().delete(`/api/tarjetas/${t1._id}`).set(auth(token)).expect(204)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas[1].cajas[0].tarjetas.map((t: { _id: string }) => t._id)).toEqual([t2._id])
    })

    it('responde 404 al eliminar una tarjeta inexistente y 400 con un id mal formado', async () => {
        await api().delete(`/api/tarjetas/${idInexistente()}`).set(auth(token)).expect(404)
        await api().delete('/api/tarjetas/xyz').set(auth(token)).expect(400)
    })

    it('un usuario no puede crear tarjetas en el tema de otro ni eliminar sus tarjetas', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id)
        const tokenOtro = await otroUsuario()

        await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(tokenOtro)).send({ pregunta: 'x', respuesta: 'y' }).expect(404)
        await api().delete(`/api/tarjetas/${tarjeta._id}`).set(auth(tokenOtro)).expect(404)

        const guardado = await temaActual()
        expect(guardado.cajas[0].tarjetas).toHaveLength(1)
    })
})

describe('PUT /api/temas/:temaId/cajas (guardar sesión de estudio)', () => {

    it('aplica el algoritmo Leitner y persiste el resultado', async () => {
        const tema = await crearTemaNuevo()
        const acertada = await crearTarjeta(tema._id, 'acierto', 'a')
        const fallada = await crearTarjeta(tema._id, 'fallo', 'f')
        const sinEvaluar = await crearTarjeta(tema._id, 'pendiente', 'p')

        // Sesión hecha en el cliente: marca dos tarjetas y deja una sin evaluar.
        const actual = await temaActual()
        actual.cajas[0].tarjetas = actual.cajas[0].tarjetas.map((t: { _id: string }) => ({
            ...t,
            es_correcta: t._id === acertada._id ? true : t._id === fallada._id ? false : null,
        }))

        const res = await api().put(`/api/temas/${tema._id}/cajas`).set(auth(token)).send({ cajas: actual.cajas })

        expect(res.status).toBe(200)
        expect(res.body._id).toBe(tema._id)
        expect(res.body.nombre).toBe(tema.nombre)

        const guardado = await temaActual()
        const ids = (caja: number) => guardado.cajas[caja].tarjetas.map((t: { _id: string }) => t._id).sort()

        expect(ids(0)).toEqual([fallada._id, sinEvaluar._id].sort())
        expect(ids(1)).toEqual([acertada._id])

        const movida = guardado.cajas[1].tarjetas[0]
        expect(movida.nivel).toBe(2)
        expect(movida.es_correcta).toBeNull()
        expect(fechaLocal(movida.proxima_revision)).toBe(enDias(3))

        const t = guardado.cajas[0].tarjetas.find((x: { _id: string }) => x._id === fallada._id)
        expect(t.nivel).toBe(1)
        expect(t.es_correcta).toBeNull()
        expect(fechaLocal(t.proxima_revision)).toBe(enDias(1))
    })

    it('solo cambia el tema estudiado', async () => {
        const asignatura = await crearAsignatura()
        const estudiado = await crearTema(asignatura._id, 'A')
        const otro = await crearTema(asignatura._id, 'B')
        await crearTarjeta(estudiado._id)
        await crearTarjeta(otro._id)

        const [antes] = await asignaturasActuales()
        const cajas = antes.temas[0].cajas
        cajas[0].tarjetas[0].es_correcta = true
        await api().put(`/api/temas/${estudiado._id}/cajas`).set(auth(token)).send({ cajas }).expect(200)

        const [despues] = await asignaturasActuales()
        expect(despues.temas[0].cajas[1].tarjetas).toHaveLength(1)
        expect(despues.temas[1]).toEqual(antes.temas[1])
    })

    it('conserva los _id de las tarjetas tras guardar (se pueden seguir borrando)', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id)
        const actual = await temaActual()
        actual.cajas[0].tarjetas[0].es_correcta = true

        await api().put(`/api/temas/${tema._id}/cajas`).set(auth(token)).send({ cajas: actual.cajas }).expect(200)
        await api().delete(`/api/tarjetas/${tarjeta._id}`).set(auth(token)).expect(204)

        const guardado = await temaActual()
        expect(guardado.cajas.flatMap((c: { tarjetas: unknown[] }) => c.tarjetas)).toHaveLength(0)
    })

    it('responde 400 si no llegan exactamente 5 cajas', async () => {
        const tema = await crearTemaNuevo()

        const res = await api().put(`/api/temas/${tema._id}/cajas`).set(auth(token)).send({ cajas: tema.cajas.slice(0, 4) })

        expect(res.status).toBe(400)
        expect(res.body.message).toBe('Se esperan exactamente 5 cajas')
    })

    it('responde 400 con un id mal formado y 404 con un tema inexistente', async () => {
        const tema = await crearTemaNuevo()

        await api().put('/api/temas/xyz/cajas').set(auth(token)).send({ cajas: tema.cajas }).expect(400)
        await api().put(`/api/temas/${idInexistente()}/cajas`).set(auth(token)).send({ cajas: tema.cajas }).expect(404)
    })

    it('un usuario no puede sobrescribir el tema de otro', async () => {
        const tema = await crearTemaNuevo()
        await crearTarjeta(tema._id)
        const tokenOtro = await otroUsuario()

        await api().put(`/api/temas/${tema._id}/cajas`).set(auth(tokenOtro)).send({ cajas: tema.cajas }).expect(404)

        const guardado = await temaActual()
        expect(guardado.cajas[0].tarjetas).toHaveLength(1)
    })
})
