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

const otroUsuario = () => registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave-del-otro' })

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
        ['patch', `/api/asignaturas/${id()}`],
        ['delete', `/api/asignaturas/${id()}`],
        ['post', `/api/asignaturas/${id()}/temas`],
        ['patch', `/api/temas/${id()}`],
        ['patch', `/api/temas/${id()}/asignatura`],
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

describe('renombrar asignaturas', () => {

    const renombrar = (id: string, nombre: unknown, t = token) =>
        api().patch(`/api/asignaturas/${id}`).set(auth(t)).send({ nombre })

    it('cambia el nombre (recortado) y conserva sus temas', async () => {
        const asignatura = await crearAsignatura('Ingles')
        const tema = await crearTema(asignatura._id)

        const res = await renombrar(asignatura._id, '  Inglés ')

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ _id: asignatura._id, nombre: 'Inglés' })
        const [guardada] = await asignaturasActuales()
        expect(guardada.nombre).toBe('Inglés')
        expect(guardada.temas.map((t: { _id: string }) => t._id)).toEqual([tema._id])
    })

    it('permite cambiar solo mayúsculas, pero no usar el nombre de otra asignatura', async () => {
        const ingles = await crearAsignatura('inglés')
        await crearAsignatura('Biología')

        await renombrar(ingles._id, 'Inglés').expect(200)

        const repetido = await renombrar(ingles._id, 'BIOLOGÍA')
        expect(repetido.status).toBe(409)
        expect(repetido.body.message).toBe('Ya existe una asignatura con ese nombre')
    })

    it('responde 400 sin nombre o con id mal formado, y 404 si no existe', async () => {
        const asignatura = await crearAsignatura()

        await renombrar(asignatura._id, '  ').expect(400)
        await renombrar(asignatura._id, 5).expect(400)
        await renombrar('xyz', 'Nueva').expect(400)
        await renombrar(idInexistente(), 'Nueva').expect(404)
    })

    it('un usuario no puede renombrar la asignatura de otro', async () => {
        const asignatura = await crearAsignatura('Mía')
        const tokenOtro = await otroUsuario()

        await renombrar(asignatura._id, 'Robada', tokenOtro).expect(404)
        const [guardada] = await asignaturasActuales()
        expect(guardada.nombre).toBe('Mía')
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

describe('renombrar temas', () => {

    const renombrar = (id: string, nombre: unknown, t = token) =>
        api().patch(`/api/temas/${id}`).set(auth(t)).send({ nombre })

    it('cambia el nombre y conserva cajas, tarjetas y progreso', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id)
        const antes = await temaActual()

        const res = await renombrar(tema._id, ' Verbos irregulares ')

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ _id: tema._id, nombre: 'Verbos irregulares' })
        const despues = await temaActual()
        expect(despues.cajas).toEqual(antes.cajas)
        expect(despues.cajas[0].tarjetas[0]._id).toBe(tarjeta._id)
    })

    it('no repite nombres dentro de la asignatura, pero sí entre asignaturas', async () => {
        const ingles = await crearAsignatura('Inglés')
        const frances = await crearAsignatura('Francés')
        const a = await crearTema(ingles._id, 'A')
        await crearTema(ingles._id, 'B')
        await crearTema(frances._id, 'C')

        const repetido = await renombrar(a._id, 'b')
        expect(repetido.status).toBe(409)
        expect(repetido.body.message).toBe('Ya existe un tema con ese nombre en la asignatura')

        await renombrar(a._id, 'C').expect(200)
        await renombrar(a._id, 'c').expect(200)
    })

    it('responde 400 sin nombre o con id mal formado, y 404 si no existe', async () => {
        const tema = await crearTemaNuevo()

        await renombrar(tema._id, '').expect(400)
        await renombrar('xyz', 'Nuevo').expect(400)
        await renombrar(idInexistente(), 'Nuevo').expect(404)
    })

    it('un usuario no puede renombrar el tema de otro', async () => {
        const tema = await crearTemaNuevo()
        const tokenOtro = await otroUsuario()

        await renombrar(tema._id, 'Robado', tokenOtro).expect(404)
        expect((await temaActual()).nombre).toBe(tema.nombre)
    })
})

describe('mover temas', () => {

    const mover = (temaId: string, asignaturaId: unknown, t = token) =>
        api().patch(`/api/temas/${temaId}/asignatura`).set(auth(t)).send({ asignaturaId })

    it('pasa el tema a otra asignatura con sus tarjetas, progreso e ids', async () => {
        const ingles = await crearAsignatura('Inglés')
        const frances = await crearAsignatura('Francés')
        const tema = await crearTema(ingles._id, 'Verbos')
        await crearTema(frances._id, 'Saludos')
        const tarjeta = await crearTarjeta(tema._id)
        const [antes] = await asignaturasActuales()

        const res = await mover(tema._id, frances._id)

        expect(res.status).toBe(200)
        expect(res.body._id).toBe(tema._id)
        const [origen, destino] = await asignaturasActuales()
        expect(origen.temas).toEqual([])
        expect(destino.temas.map((t: { nombre: string }) => t.nombre)).toEqual(['Saludos', 'Verbos'])
        expect(destino.temas[1]).toEqual(antes.temas[0])

        // Sigue funcionando con los mismos ids
        await crearTarjeta(tema._id, 'eat', 'comer')
        await api().delete(`/api/tarjetas/${tarjeta._id}`).set(auth(token)).expect(204)
    })

    it('a la misma asignatura no cambia nada', async () => {
        const asignatura = await crearAsignatura()
        const a = await crearTema(asignatura._id, 'A')
        await crearTema(asignatura._id, 'B')

        await mover(a._id, asignatura._id).expect(200)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas.map((t: { nombre: string }) => t.nombre)).toEqual(['A', 'B'])
    })

    it('responde 409 si el destino ya tiene un tema con ese nombre, sin mover nada', async () => {
        const ingles = await crearAsignatura('Inglés')
        const frances = await crearAsignatura('Francés')
        const tema = await crearTema(ingles._id, 'Verbos')
        await crearTema(frances._id, 'VERBOS')

        const res = await mover(tema._id, frances._id)

        expect(res.status).toBe(409)
        expect(res.body.message).toBe('Ya existe un tema llamado «Verbos» en «Francés»')
        const [origen] = await asignaturasActuales()
        expect(origen.temas).toHaveLength(1)
    })

    it('responde 400 con ids mal formados y 404 si el tema o la asignatura no existen', async () => {
        const asignatura = await crearAsignatura()
        const tema = await crearTema(asignatura._id)

        await mover('xyz', asignatura._id).expect(400)
        await mover(tema._id, 'xyz').expect(400)
        await mover(tema._id, undefined).expect(400)
        await mover(idInexistente(), asignatura._id).expect(404)
        await mover(tema._id, idInexistente()).expect(404)
    })

    it('no se puede mover a la asignatura de otro usuario ni mover sus temas', async () => {
        const mia = await crearAsignatura('Mía')
        const tema = await crearTema(mia._id)
        const tokenOtro = await otroUsuario()
        const ajena = (await api().post('/api/asignaturas').set(auth(tokenOtro)).send({ nombre: 'Ajena' })).body

        await mover(tema._id, ajena._id).expect(404)
        await mover(tema._id, ajena._id, tokenOtro).expect(404)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas).toHaveLength(1)
        expect(await asignaturasActuales(tokenOtro)).toEqual([expect.objectContaining({ temas: [] })])
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

const guardarSesion = (temaId: string, respuestas: unknown, t = token) =>
    api().put(`/api/temas/${temaId}/cajas`).set(auth(t)).send({ respuestas })

describe('PUT /api/temas/:temaId/cajas (guardar sesión de estudio)', () => {

    it('aplica el algoritmo Leitner y persiste el resultado', async () => {
        const tema = await crearTemaNuevo()
        const acertada = await crearTarjeta(tema._id, 'acierto', 'a')
        const fallada = await crearTarjeta(tema._id, 'fallo', 'f')
        const sinEvaluar = await crearTarjeta(tema._id, 'pendiente', 'p')

        // Sesión hecha en el cliente: responde dos tarjetas y deja una sin evaluar.
        const res = await guardarSesion(tema._id, [
            { _id: acertada._id, es_correcta: true },
            { _id: fallada._id, es_correcta: false },
        ])

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

        const pendiente = guardado.cajas[0].tarjetas.find((x: { _id: string }) => x._id === sinEvaluar._id)
        expect(pendiente).toEqual(sinEvaluar)
    })

    it('solo cambia el tema estudiado', async () => {
        const asignatura = await crearAsignatura()
        const estudiado = await crearTema(asignatura._id, 'A')
        const otro = await crearTema(asignatura._id, 'B')
        const tarjeta = await crearTarjeta(estudiado._id)
        await crearTarjeta(otro._id)

        const [antes] = await asignaturasActuales()
        await guardarSesion(estudiado._id, [{ _id: tarjeta._id, es_correcta: true }]).expect(200)

        const [despues] = await asignaturasActuales()
        expect(despues.temas[0].cajas[1].tarjetas).toHaveLength(1)
        expect(despues.temas[1]).toEqual(antes.temas[1])
    })

    it('conserva los _id de las tarjetas tras guardar (se pueden seguir borrando)', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id)

        await guardarSesion(tema._id, [{ _id: tarjeta._id, es_correcta: true }]).expect(200)
        await api().delete(`/api/tarjetas/${tarjeta._id}`).set(auth(token)).expect(204)

        const guardado = await temaActual()
        expect(guardado.cajas.flatMap((c: { tarjetas: unknown[] }) => c.tarjetas)).toHaveLength(0)
    })

    it('el cliente no puede agregar, quitar ni cambiar tarjetas al guardar', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id, 'dog', 'perro')

        // Datos de más (texto, nivel, fecha) y una tarjeta que no existe: se ignoran.
        await guardarSesion(tema._id, [
            { _id: tarjeta._id, es_correcta: true, pregunta: 'cambiada', nivel: 5, proxima_revision: '2099-01-01' },
            { _id: idInexistente(), es_correcta: true },
        ]).expect(200)

        const guardado = await temaActual()
        const todas = guardado.cajas.flatMap((c: { tarjetas: unknown[] }) => c.tarjetas)
        expect(todas).toHaveLength(1)
        expect(guardado.cajas[1].tarjetas[0]).toMatchObject({ _id: tarjeta._id, pregunta: 'dog', respuesta: 'perro', nivel: 2 })
        expect(fechaLocal(guardado.cajas[1].tarjetas[0].proxima_revision)).toBe(enDias(3))
    })

    it('ignora las respuestas a tarjetas de otro tema', async () => {
        const asignatura = await crearAsignatura()
        const a = await crearTema(asignatura._id, 'A')
        const b = await crearTema(asignatura._id, 'B')
        const deB = await crearTarjeta(b._id)

        await guardarSesion(a._id, [{ _id: deB._id, es_correcta: true }]).expect(200)

        const [guardada] = await asignaturasActuales()
        expect(guardada.temas[1].cajas[0].tarjetas.map((t: { _id: string }) => t._id)).toEqual([deB._id])
    })

    it.each([
        ['sin lista', undefined],
        ['una lista de cajas', { cajas: [] }],
        ['un id mal formado', [{ _id: 'xyz', es_correcta: true }]],
        ['es_correcta que no es booleano', [{ _id: new Types.ObjectId().toString(), es_correcta: 'true' }]],
        ['un elemento nulo', [null]],
    ])('responde 400 con %s', async (_, respuestas) => {
        const tema = await crearTemaNuevo()

        const res = await guardarSesion(tema._id, respuestas)

        expect(res.status).toBe(400)
        expect(res.body.ok).toBe(false)
    })

    it('responde 400 con un id mal formado y 404 con un tema inexistente', async () => {
        await guardarSesion('xyz', []).expect(400)
        await guardarSesion(idInexistente(), []).expect(404)
    })

    it('un usuario no puede guardar una sesión en el tema de otro', async () => {
        const tema = await crearTemaNuevo()
        const tarjeta = await crearTarjeta(tema._id)
        const tokenOtro = await otroUsuario()

        await guardarSesion(tema._id, [{ _id: tarjeta._id, es_correcta: true }], tokenOtro).expect(404)

        const guardado = await temaActual()
        expect(guardado.cajas[0].tarjetas).toHaveLength(1)
    })
})
