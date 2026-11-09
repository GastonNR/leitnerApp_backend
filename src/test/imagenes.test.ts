import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals'
import { Types } from 'mongoose'
import Imagen from '../models/Imagen.js'
import { conectarDBDeTest, limpiarDB, desconectarDBDeTest } from './helpers/db.js'
import { api, auth, registrarYLoguear } from './helpers/api.js'
import { detectarTipoImagen } from '../utils/detectarTipoImagen.js'

beforeAll(conectarDBDeTest)
afterEach(limpiarDB)
afterAll(desconectarDBDeTest)

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

// PNG de 1x1 px
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

let token: string

beforeEach(async () => {
    token = await registrarYLoguear()
})

// Crea una asignatura con ese nombre y un tema dentro; devuelve el tema.
async function crearTema(nombre = 'Inglés') {
    const asignatura = await api().post('/api/asignaturas').set(auth(token)).send({ nombre })
    expect(asignatura.status).toBe(201)
    const res = await api().post(`/api/asignaturas/${asignatura.body._id}/temas`).set(auth(token)).send({ nombre: 'General' })
    expect(res.status).toBe(201)
    return res.body
}

function crearTarjetaConImagen(temaId: string, imagen: Buffer, nombre = 'foto.png', t = token) {
    return api()
        .post(`/api/temas/${temaId}/tarjetas`)
        .set(auth(t))
        .field('pregunta', '¿Qué animal es?')
        .field('respuesta', 'Un perro')
        .attach('imagen', imagen, nombre)
}

// Todos los temas del usuario, en orden de creación.
async function temasActuales() {
    const res = await api().get('/api/asignaturas').set(auth(token)).expect(200)
    return res.body.flatMap((a: { temas: unknown[] }) => a.temas)
}

// Guarda una sesión de estudio del tema (como el botón del frontend).
const guardarSesion = (temaId: string, respuestas: Array<{ _id: string, es_correcta: boolean }>) =>
    api().put(`/api/temas/${temaId}/cajas`).set(auth(token)).send({ respuestas })

describe('detectarTipoImagen', () => {
    it('reconoce los formatos admitidos por su contenido', () => {
        expect(detectarTipoImagen(PNG)).toBe('image/png')
        expect(detectarTipoImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg')
        expect(detectarTipoImagen(Buffer.from('GIF89a\0\0\0\0\0\0'))).toBe('image/gif')
        expect(detectarTipoImagen(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
    })

    it('rechaza SVG, texto y archivos muy cortos', () => {
        expect(detectarTipoImagen(SVG)).toBeNull()
        expect(detectarTipoImagen(Buffer.from('hola, no soy una imagen'))).toBeNull()
        expect(detectarTipoImagen(Buffer.from([0x89, 0x50]))).toBeNull()
    })
})

describe('POST /api/temas/:temaId/tarjetas con imagen', () => {

    it('crea la tarjeta con su imagen y la imagen se puede descargar', async () => {
        const tema = await crearTema()
        const res = await crearTarjetaConImagen(tema._id, PNG)

        expect(res.status).toBe(201)
        expect(res.body.pregunta).toBe('¿Qué animal es?')
        expect(Types.ObjectId.isValid(res.body.imagen)).toBe(true)

        const img = await api().get(`/api/imagenes/${res.body.imagen}`).set(auth(token))
        expect(img.status).toBe(200)
        expect(img.headers['content-type']).toBe('image/png')
        expect(img.headers['x-content-type-options']).toBe('nosniff')
        expect(Buffer.compare(img.body as Buffer, PNG)).toBe(0)
    })

    it('sin imagen (JSON) la tarjeta se crea con imagen null', async () => {
        const tema = await crearTema()
        const res = await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: 'dog', respuesta: 'perro' })
        expect(res.status).toBe(201)
        expect(res.body.imagen).toBeNull()
    })

    it('rechaza archivos que no son imágenes aunque digan .png, y no crea la tarjeta', async () => {
        const tema = await crearTema()
        const res = await crearTarjetaConImagen(tema._id, Buffer.from('esto no es una imagen, es texto'), 'falsa.png')

        expect(res.status).toBe(415)
        expect(res.body.ok).toBe(false)
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas).toHaveLength(0)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('rechaza SVG', async () => {
        const tema = await crearTema()
        const res = await crearTarjetaConImagen(tema._id, SVG, 'dibujo.svg')
        expect(res.status).toBe(415)
    })

    it('rechaza imágenes de más de 2 MB', async () => {
        const tema = await crearTema()
        const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)])
        const res = await crearTarjetaConImagen(tema._id, grande)
        expect(res.status).toBe(413)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('no guarda la imagen si el tema no existe', async () => {
        const res = await crearTarjetaConImagen(new Types.ObjectId().toString(), PNG)
        expect(res.status).toBe(404)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('no guarda la imagen si falta la pregunta', async () => {
        const tema = await crearTema()
        const res = await api()
            .post(`/api/temas/${tema._id}/tarjetas`)
            .set(auth(token))
            .field('respuesta', 'Un perro')
            .attach('imagen', PNG, 'foto.png')
        expect(res.status).toBe(400)
        expect(await Imagen.countDocuments()).toBe(0)
    })
})

describe('GET /api/imagenes/:id', () => {

    it('exige token', async () => {
        const res = await api().get(`/api/imagenes/${new Types.ObjectId()}`)
        expect(res.status).toBe(401)
    })

    it('responde 400 con un id mal formado', async () => {
        const res = await api().get('/api/imagenes/no-es-un-id').set(auth(token))
        expect(res.status).toBe(400)
    })

    it('otro usuario no puede ver la imagen (404)', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)

        const otroToken = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave-segura' })
        const res = await api().get(`/api/imagenes/${tarjeta.imagen}`).set(auth(otroToken))
        expect(res.status).toBe(404)
    })
})

describe('la imagen sigue a la tarjeta', () => {

    it('sobrevive a una sesión de estudio', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)

        const res = await guardarSesion(tema._id, [{ _id: tarjeta._id, es_correcta: true }])
        expect(res.status).toBe(200)
        expect(res.body.cajas[1].tarjetas[0].imagen).toBe(tarjeta.imagen)
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('el cliente no puede asignar a una tarjeta la imagen de otra', async () => {
        const tema = await crearTema()
        const { body: conImagen } = await crearTarjetaConImagen(tema._id, PNG)
        const { body: sinImagen } = await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: 'dog', respuesta: 'perro' })

        const res = await api().put(`/api/temas/${tema._id}/cajas`).set(auth(token))
            .send({ respuestas: [{ _id: sinImagen._id, es_correcta: false, imagen: conImagen.imagen }] })

        const guardada = res.body.cajas[0].tarjetas.find((t: { _id: string }) => t._id === sinImagen._id)
        expect(guardada.imagen).toBeNull()
    })

    it('al borrar la tarjeta se borra su imagen', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)
        expect(await Imagen.countDocuments()).toBe(1)

        await api().delete(`/api/tarjetas/${tarjeta._id}`).set(auth(token)).expect(204)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('al borrar un tema se borran sus imágenes, y no las de otros temas', async () => {
        const ingles = await crearTema('Inglés')
        const bio = await crearTema('Biología')
        await crearTarjetaConImagen(ingles._id, PNG)
        await crearTarjetaConImagen(ingles._id, PNG)
        await crearTarjetaConImagen(bio._id, PNG)

        await api().delete(`/api/temas/${ingles._id}`).set(auth(token)).expect(204)
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('al borrar la asignatura se borran las imágenes de todos sus temas, y no las de otras', async () => {
        const ingles = await crearTema('Inglés')
        const bio = await crearTema('Biología')
        const { body: [asignaturaIngles] } = await api().get('/api/asignaturas').set(auth(token))
        const otroTema = await api().post(`/api/asignaturas/${asignaturaIngles._id}/temas`).set(auth(token)).send({ nombre: 'Verbos' })
        await crearTarjetaConImagen(ingles._id, PNG)
        await crearTarjetaConImagen(otroTema.body._id, PNG)
        await crearTarjetaConImagen(bio._id, PNG)

        await api().delete(`/api/asignaturas/${asignaturaIngles._id}`).set(auth(token)).expect(204)
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('una sesión no puede quitar tarjetas ni borrar sus imágenes', async () => {
        const tema = await crearTema()
        await crearTarjetaConImagen(tema._id, PNG)

        await guardarSesion(tema._id, []).expect(200)
        expect(await Imagen.countDocuments()).toBe(1)
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas).toHaveLength(1)
    })
})

describe('imagen de una tarjeta existente', () => {

    // JPEG mínimo válido para el detector (otra imagen distinta del PNG)
    const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)])

    async function tarjetaSinImagen() {
        const tema = await crearTema()
        const res = await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: 'dog', respuesta: 'perro' })
        return res.body
    }

    const ponerImagen = (tarjetaId: string, imagen: Buffer, nombre = 'foto.png', t = token) =>
        api().put(`/api/imagenes/tarjeta/${tarjetaId}`).set(auth(t)).attach('imagen', imagen, nombre)

    it.each([
        ['put', `/api/imagenes/tarjeta/${new Types.ObjectId()}`],
        ['delete', `/api/imagenes/tarjeta/${new Types.ObjectId()}`],
    ] as Array<['put' | 'delete', string]>)('%s %s exige token', async (metodo, ruta) => {
        const res = await api()[metodo](ruta)
        expect(res.status).toBe(401)
    })

    it('agrega una imagen a una tarjeta que no tenía', async () => {
        const tarjeta = await tarjetaSinImagen()
        const res = await ponerImagen(tarjeta._id, PNG)

        expect(res.status).toBe(200)
        expect(res.body._id).toBe(tarjeta._id)
        expect(Types.ObjectId.isValid(res.body.imagen)).toBe(true)

        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].imagen).toBe(res.body.imagen)
        await api().get(`/api/imagenes/${res.body.imagen}`).set(auth(token)).expect(200)
    })

    it('reemplaza la imagen y borra la anterior', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)

        const res = await ponerImagen(tarjeta._id, JPEG, 'otra.jpg')
        expect(res.status).toBe(200)
        expect(res.body.imagen).not.toBe(tarjeta.imagen)

        await api().get(`/api/imagenes/${tarjeta.imagen}`).set(auth(token)).expect(404)
        const nueva = await api().get(`/api/imagenes/${res.body.imagen}`).set(auth(token)).expect(200)
        expect(nueva.headers['content-type']).toBe('image/jpeg')
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('conserva la tarjeta (nivel, caja, fechas) al cambiar la imagen', async () => {
        const tarjeta = await tarjetaSinImagen()
        const res = await ponerImagen(tarjeta._id, PNG)
        expect(res.body).toMatchObject({
            pregunta: tarjeta.pregunta,
            respuesta: tarjeta.respuesta,
            nivel: tarjeta.nivel,
            proxima_revision: tarjeta.proxima_revision,
        })
    })

    it('si la imagen nueva no es válida, la tarjeta conserva la anterior', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)

        const res = await ponerImagen(tarjeta._id, Buffer.from('<svg></svg> no soy imagen'), 'x.svg')
        expect(res.status).toBe(415)

        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].imagen).toBe(tarjeta.imagen)
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('responde 400 si no se envía la imagen', async () => {
        const tarjeta = await tarjetaSinImagen()
        const res = await api().put(`/api/imagenes/tarjeta/${tarjeta._id}`).set(auth(token)).send({})
        expect(res.status).toBe(400)
    })

    it('responde 400 con un id de tarjeta mal formado', async () => {
        await ponerImagen('no-es-un-id', PNG).expect(400)
        await api().delete('/api/imagenes/tarjeta/no-es-un-id').set(auth(token)).expect(400)
    })

    it('responde 404 si la tarjeta no existe, sin guardar la imagen', async () => {
        const res = await ponerImagen(new Types.ObjectId().toString(), PNG)
        expect(res.status).toBe(404)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('otro usuario no puede cambiar ni quitar la imagen de mi tarjeta', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)
        const otroToken = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave-segura' })

        await ponerImagen(tarjeta._id, JPEG, 'otra.jpg', otroToken).expect(404)
        await api().delete(`/api/imagenes/tarjeta/${tarjeta._id}`).set(auth(otroToken)).expect(404)

        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].imagen).toBe(tarjeta.imagen)
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('quita la imagen de la tarjeta y la borra', async () => {
        const tema = await crearTema()
        const { body: tarjeta } = await crearTarjetaConImagen(tema._id, PNG)

        const res = await api().delete(`/api/imagenes/tarjeta/${tarjeta._id}`).set(auth(token))
        expect(res.status).toBe(200)
        expect(res.body.imagen).toBeNull()

        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].imagen).toBeNull()
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('quitar la imagen de una tarjeta sin imagen responde 404', async () => {
        const tarjeta = await tarjetaSinImagen()
        await api().delete(`/api/imagenes/tarjeta/${tarjeta._id}`).set(auth(token)).expect(404)
    })

    it('funciona con tarjetas que ya no están en la caja 1', async () => {
        const tarjeta = await tarjetaSinImagen()
        const [l] = await temasActuales()
        await guardarSesion(l._id, [{ _id: tarjeta._id, es_correcta: true }]).expect(200)

        const res = await ponerImagen(tarjeta._id, PNG)
        expect(res.status).toBe(200)
        const [despues] = await temasActuales()
        expect(despues.cajas[1].tarjetas[0].imagen).toBe(res.body.imagen)
    })
})

describe('PATCH /api/tarjetas/:tarjetaId (editar tarjeta)', () => {

    const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)])
    const editar = (tarjetaId: string, t = token) => api().patch(`/api/tarjetas/${tarjetaId}`).set(auth(t))

    async function tarjeta(conImagen = false, nombreAsignatura = 'Inglés') {
        const tema = await crearTema(nombreAsignatura)
        const res = conImagen
            ? await crearTarjetaConImagen(tema._id, PNG)
            : await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token)).send({ pregunta: 'dog', respuesta: 'perro' })
        return res.body
    }

    it('exige token', async () => {
        await api().patch(`/api/tarjetas/${new Types.ObjectId()}`).send({ pregunta: 'a', respuesta: 'b' }).expect(401)
    })

    it('cambia el texto (JSON) y conserva imagen, nivel y fechas', async () => {
        const t = await tarjeta(true)
        const res = await editar(t._id).send({ pregunta: '  **cat**  ', respuesta: 'gato' })

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            _id: t._id,
            pregunta: '**cat**',
            respuesta: 'gato',
            imagen: t.imagen,
            nivel: t.nivel,
            proxima_revision: t.proxima_revision,
        })
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].pregunta).toBe('**cat**')
        await api().get(`/api/imagenes/${t.imagen}`).set(auth(token)).expect(200)
    })

    it('cambia texto e imagen juntos (multipart) y borra la imagen anterior', async () => {
        const t = await tarjeta(true)
        const res = await editar(t._id).field('pregunta', 'cat').field('respuesta', 'gato').attach('imagen', JPEG, 'otra.jpg')

        expect(res.status).toBe(200)
        expect(res.body.pregunta).toBe('cat')
        expect(res.body.imagen).not.toBe(t.imagen)
        await api().get(`/api/imagenes/${t.imagen}`).set(auth(token)).expect(404)
        const nueva = await api().get(`/api/imagenes/${res.body.imagen}`).set(auth(token)).expect(200)
        expect(nueva.headers['content-type']).toBe('image/jpeg')
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('guarda los saltos de línea como \\n aunque multipart los envíe como \\r\\n', async () => {
        const t = await tarjeta()
        const res = await editar(t._id).field('pregunta', 'uno\r\ndos').field('respuesta', '- a\r\n- b').attach('imagen', PNG, 'f.png')
        expect(res.body).toMatchObject({ pregunta: 'uno\ndos', respuesta: '- a\n- b' })

        const tema = await crearTema('Francés')
        const creada = await api().post(`/api/temas/${tema._id}/tarjetas`).set(auth(token))
            .field('pregunta', 'x\r\ny').field('respuesta', 'z').attach('imagen', PNG, 'f.png')
        expect(creada.body.pregunta).toBe('x\ny')
    })

    it('agrega una imagen a una tarjeta que no tenía', async () => {
        const t = await tarjeta()
        const res = await editar(t._id).field('pregunta', 'dog').field('respuesta', 'perro').attach('imagen', PNG, 'foto.png')
        expect(res.status).toBe(200)
        expect(Types.ObjectId.isValid(res.body.imagen)).toBe(true)
    })

    it('quitarImagen=true (multipart o JSON) quita y borra la imagen', async () => {
        const t1 = await tarjeta(true)
        const r1 = await editar(t1._id).field('pregunta', 'a').field('respuesta', 'b').field('quitarImagen', 'true')
        expect(r1.status).toBe(200)
        expect(r1.body.imagen).toBeNull()

        const t2 = await tarjeta(true, 'Francés')
        const r2 = await editar(t2._id).send({ pregunta: 'a', respuesta: 'b', quitarImagen: true })
        expect(r2.body.imagen).toBeNull()
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('rechaza texto vacío sin tocar la tarjeta ni guardar la imagen', async () => {
        const t = await tarjeta(true)
        const res = await editar(t._id).field('pregunta', '   ').field('respuesta', 'gato').attach('imagen', JPEG, 'otra.jpg')
        expect(res.status).toBe(400)
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0]).toMatchObject({ pregunta: '¿Qué animal es?', imagen: t.imagen })
        expect(await Imagen.countDocuments()).toBe(1)
    })

    it('si la imagen nueva no es válida, no cambia nada', async () => {
        const t = await tarjeta(true)
        const res = await editar(t._id).field('pregunta', 'cat').field('respuesta', 'gato').attach('imagen', Buffer.from('no soy imagen'), 'x.png')
        expect(res.status).toBe(415)
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0]).toMatchObject({ pregunta: '¿Qué animal es?', imagen: t.imagen })
    })

    it('responde 400 con id mal formado y 404 si la tarjeta no existe (sin guardar la imagen)', async () => {
        await editar('no-es-id').send({ pregunta: 'a', respuesta: 'b' }).expect(400)
        await editar(String(new Types.ObjectId())).field('pregunta', 'a').field('respuesta', 'b').attach('imagen', PNG, 'f.png').expect(404)
        expect(await Imagen.countDocuments()).toBe(0)
    })

    it('otro usuario no puede editar mi tarjeta', async () => {
        const t = await tarjeta()
        const otro = await registrarYLoguear({ nombre: 'otro', email: 'otro@example.com', password: 'clave-segura' })
        await editar(t._id, otro).send({ pregunta: 'hack', respuesta: 'hack' }).expect(404)
        const [l] = await temasActuales()
        expect(l.cajas[0].tarjetas[0].pregunta).toBe('dog')
    })

    it('edita tarjetas que ya no están en la caja 1, sin moverlas', async () => {
        const t = await tarjeta()
        const [l] = await temasActuales()
        await guardarSesion(l._id, [{ _id: t._id, es_correcta: true }]).expect(200)

        await editar(t._id).send({ pregunta: 'cat', respuesta: 'gato' }).expect(200)
        const [despues] = await temasActuales()
        expect(despues.cajas[0].tarjetas).toHaveLength(0)
        expect(despues.cajas[1].tarjetas[0]).toMatchObject({ pregunta: 'cat', nivel: 2 })
    })
})
