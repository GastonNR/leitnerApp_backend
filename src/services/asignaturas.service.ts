import { isValidObjectId } from "mongoose"
import { ASIGNATURAS_MAX, NOMBRE_MAX, TEMAS_POR_ASIGNATURA_MAX } from "../config/limites.js"
import { AppError } from "../types/AppError.js"
import { IAsignatura, ITema } from "../types/models.types.js"
import { buscarAsignatura, buscarTema, buscarUsuario, mismoNombre } from "./buscar.js"
import { eliminarImagenesService } from "./imagenes.service.js"
import { crearCajasVacias, imagenesDeTema, ordenarTarjetasEnCajas } from "./leitner.js"
import { eliminarRepasosDeTemas, registrarRepaso } from "./repasos.service.js"

function validarNombre(nombre: string): void {
    if (nombre.trim().length > NOMBRE_MAX) throw new AppError(`El nombre no puede superar los ${NOMBRE_MAX} caracteres`, 400)
}

// ==========================================
// ASIGNATURAS
// ==========================================

export const getAsignaturasService = async (usuarioId: string): Promise<IAsignatura[]> => {
    const usuario = await buscarUsuario(usuarioId)
    return usuario.asignaturas
}

export const createAsignaturaService = async (usuarioId: string, nombre: string): Promise<IAsignatura> => {

    validarNombre(nombre)
    const usuario = await buscarUsuario(usuarioId)

    if (usuario.asignaturas.length >= ASIGNATURAS_MAX) {
        throw new AppError(`No se pueden tener más de ${ASIGNATURAS_MAX} asignaturas`, 400)
    }
    if (usuario.asignaturas.some(a => mismoNombre(a.nombre, nombre))) {
        throw new AppError("Ya existe una asignatura con ese nombre", 409)
    }

    usuario.asignaturas.push({ nombre: nombre.trim(), fechaCreacion: new Date(), temas: [] })
    await usuario.save()

    return usuario.asignaturas[usuario.asignaturas.length - 1].toObject()
}

// Cambia el nombre. Puede quedar igual o cambiar solo mayúsculas; no puede
// coincidir con el de otra asignatura.
export const renameAsignaturaService = async (usuarioId: string, asignaturaId: string, nombre: string): Promise<IAsignatura> => {

    validarNombre(nombre)
    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    if (usuario.asignaturas.some(a => !a._id.equals(asignatura._id) && mismoNombre(a.nombre, nombre))) {
        throw new AppError("Ya existe una asignatura con ese nombre", 409)
    }

    asignatura.nombre = nombre.trim()
    await usuario.save()
    return asignatura.toObject()
}

// Borra la asignatura con todos sus temas, tarjetas e imágenes.
export const deleteAsignaturaService = async (usuarioId: string, asignaturaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    const imagenes = asignatura.temas.flatMap(imagenesDeTema)
    const temas = asignatura.temas.map(t => t._id)

    asignatura.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
    await eliminarRepasosDeTemas(usuarioId, temas)
}

// ==========================================
// TEMAS
// ==========================================

// Crea un tema con sus 5 cajas vacías. El nombre no se repite dentro de la
// misma asignatura (sí puede repetirse en otra).
export const createTemaService = async (usuarioId: string, asignaturaId: string, nombre: string): Promise<ITema> => {

    validarNombre(nombre)
    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    if (asignatura.temas.length >= TEMAS_POR_ASIGNATURA_MAX) {
        throw new AppError(`Una asignatura no puede tener más de ${TEMAS_POR_ASIGNATURA_MAX} temas`, 400)
    }

    if (asignatura.temas.some(t => mismoNombre(t.nombre, nombre))) {
        throw new AppError("Ya existe un tema con ese nombre en la asignatura", 409)
    }

    asignatura.temas.push({ nombre: nombre.trim(), fechaCreacion: new Date(), cajas: crearCajasVacias() })
    await usuario.save()

    return asignatura.temas[asignatura.temas.length - 1].toObject()
}

// Cambia el nombre del tema; no puede coincidir con otro de la misma asignatura.
// Sus cajas y tarjetas no cambian.
export const renameTemaService = async (usuarioId: string, temaId: string, nombre: string): Promise<ITema> => {

    validarNombre(nombre)
    const usuario = await buscarUsuario(usuarioId)
    const { asignatura, tema } = buscarTema(usuario, temaId)

    if (asignatura.temas.some(t => !t._id.equals(tema._id) && mismoNombre(t.nombre, nombre))) {
        throw new AppError("Ya existe un tema con ese nombre en la asignatura", 409)
    }

    tema.nombre = nombre.trim()
    await usuario.save()
    return tema.toObject()
}

// Pasa el tema a otra asignatura del usuario, con sus cajas, tarjetas y
// progreso (el tema y sus tarjetas conservan sus _id). Va al final de la lista.
export const moveTemaService = async (usuarioId: string, temaId: string, asignaturaDestinoId: string): Promise<ITema> => {

    const usuario = await buscarUsuario(usuarioId)
    const { asignatura: origen, tema } = buscarTema(usuario, temaId)
    const destino = buscarAsignatura(usuario, asignaturaDestinoId)

    if (origen._id.equals(destino._id)) return tema.toObject()

    if (destino.temas.length >= TEMAS_POR_ASIGNATURA_MAX) {
        throw new AppError(`Una asignatura no puede tener más de ${TEMAS_POR_ASIGNATURA_MAX} temas`, 400)
    }

    if (destino.temas.some(t => mismoNombre(t.nombre, tema.nombre))) {
        throw new AppError(`Ya existe un tema llamado «${tema.nombre}» en «${destino.nombre}»`, 409)
    }

    const datos = tema.toObject()
    tema.deleteOne()
    destino.temas.push(datos)
    await usuario.save()

    return destino.temas[destino.temas.length - 1].toObject()
}

export const deleteTemaService = async (usuarioId: string, temaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    const imagenes = imagenesDeTema(tema)

    tema.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
    await eliminarRepasosDeTemas(usuarioId, [tema._id])
}

export interface RespuestaSesion {
    _id: string
    es_correcta: boolean
}

// Valida el cuerpo de una sesión: [{ _id, es_correcta }], con ids de tarjeta
// válidos y respuestas booleanas.
function leerRespuestas(respuestas: unknown): Map<string, boolean> {
    if (!Array.isArray(respuestas)) throw new AppError("Se espera la lista de respuestas de la sesión", 400)

    const porTarjeta = new Map<string, boolean>()
    for (const r of respuestas) {
        if (!r || typeof r !== 'object' || !isValidObjectId(r._id) || typeof r.es_correcta !== 'boolean') {
            throw new AppError("Cada respuesta debe tener el _id de la tarjeta y es_correcta (true o false)", 400)
        }
        porTarjeta.set(String(r._id), r.es_correcta)
    }
    return porTarjeta
}

// Guarda una sesión de estudio del tema: aplica el algoritmo Leitner a sus cajas.
// El cliente solo dice qué tarjetas acertó y cuáles falló; las tarjetas (texto,
// imagen, nivel, fechas) se toman siempre de lo guardado. Las respuestas a
// tarjetas que ya no están en el tema (p. ej. borradas mientras se estudiaba)
// se ignoran, y las tarjetas sin respuesta se quedan como están.
export const guardarSesionService = async (usuarioId: string, temaId: string, respuestas: unknown): Promise<ITema> => {

    const porTarjeta = leerRespuestas(respuestas)

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    let aciertos = 0
    let fallos = 0
    const cajas = tema.cajas.map(caja => ({
        nombre: caja.nombre,
        tarjetas: caja.tarjetas.map(t => {
            const tarjeta = t.toObject()
            const respuesta = porTarjeta.get(tarjeta._id.toString())
            tarjeta.es_correcta = respuesta ?? null
            if (respuesta === true) aciertos++
            if (respuesta === false) fallos++
            return tarjeta
        }),
    }))

    tema.set({ cajas: ordenarTarjetasEnCajas({ cajas }) })
    await usuario.save()
    await registrarRepaso(usuarioId, tema._id, aciertos, fallos)

    return tema.toObject()
}
