import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals'
import Repaso from '../models/Repaso.js'
import { conectarDBDeTest, limpiarDB, desconectarDBDeTest } from './helpers/db.js'
import { api, auth, registrarYLoguear } from './helpers/api.js'

beforeAll(conectarDBDeTest)
afterEach(limpiarDB)
afterAll(desconectarDBDeTest)

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

let token: string

beforeEach(async () => {
    token = await registrarYLoguear()
})

async function crearTemaConTarjetas(cantidad: number, asignatura = 'Inglés', tema = 'Verbos', t = token) {
    const a = await api().post('/api/asignaturas').set(auth(t)).send({ nombre: asignatura })
    const tm = await api().post(`/api/asignaturas/${a.body._id}/temas`).set(auth(t)).send({ nombre: tema })
    for (let i = 0; i < cantidad; i++) {
        await api().post(`/api/temas/${tm.body._id}/tarjetas`).set(auth(t)).send({ pregunta: `p${i}`, respuesta: `r${i}` }).expect(201)
    }
    return { asignaturaId: a.body._id as string, temaId: tm.body._id as string }
}

// Sesión de estudio: marca las tarjetas de la caja 1 con las respuestas dadas
// (true, false o null = sin evaluar) y la guarda.
async function estudiar(temaId: string, respuestas: Array<boolean | null>, t = token) {
    const res = await api().get('/api/asignaturas').set(auth(t))
    const tema = res.body.flatMap((a: { temas: unknown[] }) => a.temas).find((x: { _id: string }) => x._id === temaId)
    tema.cajas[0].tarjetas.forEach((tarjeta: { es_correcta: boolean | null }, i: number) => {
        tarjeta.es_correcta = respuestas[i] ?? null
    })
    await api().put(`/api/temas/${temaId}/cajas`).set(auth(t)).send({ cajas: tema.cajas }).expect(200)
}

const historial = (query = '', t = token) => api().get(`/api/repasos${query}`).set(auth(t))

describe('historial de repasos', () => {

    it('exige token', async () => {
        await api().get('/api/repasos').expect(401)
    })

    it('un usuario nuevo no tiene repasos', async () => {
        const res = await historial()
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('guardar una sesión registra el tema, la fecha y los aciertos y fallos', async () => {
        const { temaId } = await crearTemaConTarjetas(3)

        await estudiar(temaId, [true, false, true])

        const res = await historial()
        expect(res.body).toEqual([{ tema: temaId, fecha: expect.any(String), aciertos: 2, fallos: 1 }])
        expect(Date.now() - new Date(res.body[0].fecha).getTime()).toBeLessThan(60_000)
    })

    it('no cuenta las tarjetas sin evaluar ni registra sesiones vacías', async () => {
        const { temaId } = await crearTemaConTarjetas(3)

        await estudiar(temaId, [true, null, null])
        await estudiar(temaId, [null, null, null])

        const res = await historial()
        expect(res.body).toHaveLength(1)
        expect(res.body[0]).toMatchObject({ aciertos: 1, fallos: 0 })
    })

    it('ordena de la sesión más vieja a la más nueva y filtra por días', async () => {
        const { temaId } = await crearTemaConTarjetas(1)
        await estudiar(temaId, [true])
        const [reciente] = await Repaso.find({})
        const vieja = new Date()
        vieja.setDate(vieja.getDate() - 40)
        await Repaso.create({ usuario: reciente.usuario, tema: reciente.tema, fecha: vieja, aciertos: 0, fallos: 2 })

        const todos = (await historial('?dias=90')).body
        expect(todos.map((r: { fallos: number }) => r.fallos)).toEqual([2, 0])

        const ultimos30 = (await historial('?dias=30')).body
        expect(ultimos30).toHaveLength(1)
    })

    it.each(['0', '366', 'abc', '1.5'])('responde 400 con dias=%s', async dias => {
        await historial(`?dias=${dias}`).expect(400)
    })

    it('cada usuario ve solo su historial', async () => {
        const { temaId } = await crearTemaConTarjetas(1)
        await estudiar(temaId, [true])
        const tokenOtro = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave' })

        expect((await historial('', tokenOtro)).body).toEqual([])
    })

    it('al borrar un tema o una asignatura se borra su historial, y no el de otros', async () => {
        const ingles = await crearTemaConTarjetas(1, 'Inglés', 'Verbos')
        const bio = await crearTemaConTarjetas(1, 'Biología', 'Célula')
        const otroTema = await api().post(`/api/asignaturas/${ingles.asignaturaId}/temas`).set(auth(token)).send({ nombre: 'Vocabulario' })
        await api().post(`/api/temas/${otroTema.body._id}/tarjetas`).set(auth(token)).send({ pregunta: 'a', respuesta: 'b' })
        await estudiar(ingles.temaId, [true])
        await estudiar(otroTema.body._id, [false])
        await estudiar(bio.temaId, [true])

        await api().delete(`/api/temas/${otroTema.body._id}`).set(auth(token)).expect(204)
        expect((await historial()).body.map((r: { tema: string }) => r.tema).sort()).toEqual([ingles.temaId, bio.temaId].sort())

        await api().delete(`/api/asignaturas/${ingles.asignaturaId}`).set(auth(token)).expect(204)
        expect((await historial()).body.map((r: { tema: string }) => r.tema)).toEqual([bio.temaId])
    })

    it('el historial sigue al tema cuando se mueve de asignatura', async () => {
        const ingles = await crearTemaConTarjetas(1, 'Inglés', 'Verbos')
        const frances = await api().post('/api/asignaturas').set(auth(token)).send({ nombre: 'Francés' })
        await estudiar(ingles.temaId, [true])

        await api().patch(`/api/temas/${ingles.temaId}/asignatura`).set(auth(token)).send({ asignaturaId: frances.body._id }).expect(200)
        await api().delete(`/api/asignaturas/${ingles.asignaturaId}`).set(auth(token)).expect(204)

        expect((await historial()).body.map((r: { tema: string }) => r.tema)).toEqual([ingles.temaId])
    })
})
