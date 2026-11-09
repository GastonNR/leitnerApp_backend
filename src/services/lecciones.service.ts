import Usuario from "../models/Usuarios.js"
import { AppError } from "../types/AppError.js"
import { TarjetaDTO } from "../types/lecciones.types.js"
import { ICaja, ILeccion, ITarjeta, UsuarioDocument } from "../types/models.types.js"
import { eliminarImagenesService, guardarImagenService } from "./imagenes.service.js"
import { Types } from "mongoose"

// ==========================
// DOMAIN reglas del sistema
// ==========================

const NIVEL_MIN = 1
const NIVEL_MAX = 5

// Días hasta la próxima revisión según el nivel al que pasa la tarjeta.
export const DIAS_POR_NIVEL: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30,
}

function crearCajasVacias(): ICaja[] {
    return [
        { nombre: "Caja 1", tarjetas: [] },
        { nombre: "Caja 2", tarjetas: [] },
        { nombre: "Caja 3", tarjetas: [] },
        { nombre: "Caja 4", tarjetas: [] },
        { nombre: "Caja 5", tarjetas: [] },
    ] as ICaja[]
}

function sumarDias(fecha: Date, dias: number): Date {
    const resultado = new Date(fecha)
    resultado.setDate(resultado.getDate() + dias)
    return resultado
}

// Normaliza un nivel desconocido o fuera de rango para que ninguna tarjeta se pierda.
function nivelValido(nivel: unknown): number {
    const n = Number(nivel)
    if (!Number.isInteger(n)) return NIVEL_MIN
    return Math.min(Math.max(n, NIVEL_MIN), NIVEL_MAX)
}

export function crearNuevaTarjeta(pregunta: string, respuesta: string, imagen: Types.ObjectId | null = null): ITarjeta {

    const fechaActual: Date = new Date()

    return {
        pregunta: pregunta,
        respuesta: respuesta,
        nivel: NIVEL_MIN,
        ultima_revision: fechaActual,
        proxima_revision: sumarDias(fechaActual, DIAS_POR_NIVEL[NIVEL_MIN]),
        es_correcta: null,
        imagen
    }
}

// Ids de las imágenes de todas las tarjetas de una lección.
function imagenesDeLeccion(leccion: Pick<ILeccion, 'cajas'>): string[] {
    return leccion.cajas.flatMap(c => c.tarjetas ?? []).map(t => t.imagen?.toString()).filter((id): id is string => !!id)
}

export function ordenarTarjetasEnCajas(datosTarjetas: Pick<ILeccion, 'cajas'>): ICaja[] {

    const nuevasCajas: ICaja[] = crearCajasVacias()
    const fechaActual: Date = new Date()

    datosTarjetas.cajas.forEach((caja, indiceCaja) => {

        for (const tarjetaEvaluada of caja.tarjetas ?? []) {

            // Sin evaluar en esta sesión: se queda en su caja actual sin cambios.
            if (tarjetaEvaluada.es_correcta !== true && tarjetaEvaluada.es_correcta !== false) {
                tarjetaEvaluada.es_correcta = null
                nuevasCajas[indiceCaja].tarjetas.push(tarjetaEvaluada)
                continue
            }

            const nuevoNivel = tarjetaEvaluada.es_correcta
                ? Math.min(nivelValido(tarjetaEvaluada.nivel) + 1, NIVEL_MAX)
                : NIVEL_MIN

            tarjetaEvaluada.nivel = nuevoNivel
            tarjetaEvaluada.ultima_revision = fechaActual
            tarjetaEvaluada.proxima_revision = sumarDias(fechaActual, DIAS_POR_NIVEL[nuevoNivel])
            tarjetaEvaluada.es_correcta = null

            nuevasCajas[nuevoNivel - 1].tarjetas.push(tarjetaEvaluada)
        }
    })

    return nuevasCajas

}

// =======================================
// SERVICES controladores de persistencia
// =======================================

async function buscarUsuario(usuarioId: string): Promise<UsuarioDocument> {
    const usuario: UsuarioDocument | null = await Usuario.findById(usuarioId)
    if (!usuario) throw new AppError("Usuario no encontrado", 404)
    return usuario
}

// SERVICIO DE LECCIONES

export const createLectionService = async (nombreLeccion: string, usuario_id: string): Promise<ILeccion> => {

    const usuario = await buscarUsuario(usuario_id)

    const nombreDuplicado = usuario.lecciones.some(
        l => l.nombre.toLowerCase() === nombreLeccion.trim().toLowerCase()
    )

    if (nombreDuplicado) {
        throw new AppError("Ya existe una lección con ese nombre", 409)
    }

    usuario.lecciones.push({
        nombre: nombreLeccion.trim(),
        fechaCreacion: new Date(),
        cajas: crearCajasVacias()
    })

    await usuario.save()

    const leccionGuardada = usuario.lecciones[usuario.lecciones.length - 1]
    if (!leccionGuardada) throw new Error("Error al recuperar la lección.")

    return leccionGuardada.toObject()

}

export const getUserLectionsService = async (usuario_id: string): Promise<ILeccion[]> => {
    const usuario = await buscarUsuario(usuario_id)
    return usuario.lecciones
}

export const deleteLeccionService = async (usuario_id: string, leccion_id: string): Promise<void> => {

    const usuario = await buscarUsuario(usuario_id)

    const leccion = usuario.lecciones.id(leccion_id)
    if (!leccion) throw new AppError("Lección no encontrada.", 404)

    const imagenes = imagenesDeLeccion(leccion)

    leccion.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuario_id, imagenes)
}

// SERVICIOS DE TARJETAS

export const createCardService = async (usuarioId: string, leccionId: string, tarjetaDatos: TarjetaDTO, imagen?: Buffer): Promise<ITarjeta> => {

    const pregunta = tarjetaDatos.pregunta?.trim()
    const respuesta = tarjetaDatos.respuesta?.trim()
    if (!pregunta || !respuesta) throw new AppError("La pregunta y la respuesta son obligatorias.", 400)

    const usuario = await buscarUsuario(usuarioId)

    const leccion = usuario.lecciones.id(leccionId)
    if (!leccion) throw new AppError("Lección no encontrada.", 404)

    // La imagen se guarda primero; si la tarjeta no llega a guardarse, se borra
    // para no dejar imágenes huérfanas.
    const imagenId = imagen ? await guardarImagenService(usuarioId, imagen) : null

    try {
        leccion.cajas[0].tarjetas.push(crearNuevaTarjeta(pregunta, respuesta, imagenId))
        await usuario.save()
    } catch (error) {
        await eliminarImagenesService(usuarioId, [imagenId])
        throw error
    }

    const tarjetas = leccion.cajas[0].tarjetas
    return tarjetas[tarjetas.length - 1]

}

export const updateBoxesService = async (usuarioId: string, datosTarjetas: Pick<ILeccion, '_id' | 'cajas'>) => {

    const cajasNuevas = datosTarjetas.cajas

    if (!Array.isArray(cajasNuevas) || cajasNuevas.length !== 5) throw new AppError("Se esperan exactamente 5 cajas", 400)

    if (!datosTarjetas._id) throw new AppError("La lección no tiene ID", 400)

    const usuario = await buscarUsuario(usuarioId)

    const leccion = usuario.lecciones.id(datosTarjetas._id)
    if (!leccion) throw new AppError("Lección no encontrada", 404)

    // La imagen de cada tarjeta la decide el servidor, no el cliente: se toma de la
    // tarjeta guardada con el mismo _id. Así el cliente no puede perderla ni
    // apuntar a imágenes de otro.
    const imagenAnterior = new Map<string, Types.ObjectId | null>()
    for (const caja of leccion.cajas) {
        for (const t of caja.tarjetas) imagenAnterior.set(t._id.toString(), t.imagen ?? null)
    }
    for (const caja of cajasNuevas) {
        for (const t of caja?.tarjetas ?? []) {
            t.imagen = (t._id && imagenAnterior.get(String(t._id))) || null
        }
    }

    const cajasOrdenadas = ordenarTarjetasEnCajas(datosTarjetas)
    leccion.set({ cajas: cajasOrdenadas })
    await usuario.save()

    // Imágenes de tarjetas que ya no están en la lección guardada.
    const siguen = new Set(imagenesDeLeccion(leccion))
    const huerfanas = [...imagenAnterior.values()].map(id => id?.toString()).filter(id => id && !siguen.has(id))
    await eliminarImagenesService(usuarioId, huerfanas)

    return leccion

}

export const deleteCardService = async (usuarioId: string, tarjetaId: string) => {

    // Antes del $pull se busca la imagen de la tarjeta, para borrarla también.
    const usuario = await Usuario.findOne(
        { _id: usuarioId, "lecciones.cajas.tarjetas._id": tarjetaId },
        { "lecciones.cajas.tarjetas._id": 1, "lecciones.cajas.tarjetas.imagen": 1 }
    ).lean()
    const tarjeta = usuario?.lecciones
        .flatMap(l => l.cajas).flatMap(c => c.tarjetas)
        .find(t => t._id?.toString() === tarjetaId)

    const resultado = await Usuario.updateOne(
        { _id: usuarioId },
        { $pull: { "lecciones.$[].cajas.$[].tarjetas": { _id: tarjetaId } } }
    )

    if (resultado.modifiedCount === 0) throw new AppError("Tarjeta no encontrada", 404)

    await eliminarImagenesService(usuarioId, [tarjeta?.imagen])

    return resultado

}
