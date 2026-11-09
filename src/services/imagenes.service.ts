import { isValidObjectId, Types } from "mongoose"
import Imagen from "../models/Imagen.js"
import Usuario from "../models/Usuarios.js"
import { AppError } from "../types/AppError.js"
import { ITarjeta, TarjetaSubdocument, UsuarioDocument } from "../types/models.types.js"
import { detectarTipoImagen, TipoImagen } from "../utils/detectarTipoImagen.js"

// Tamaño máximo de una imagen ya subida. El frontend la reduce antes de enviarla,
// así que en la práctica llegan imágenes de unos cientos de KB.
export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024

export interface ImagenGuardada {
    datos: Buffer
    tipo: TipoImagen | string
}

// Valida y guarda una imagen del usuario. Devuelve su _id.
export const guardarImagenService = async (usuarioId: string, datos: Buffer): Promise<Types.ObjectId> => {

    if (datos.length > TAMANO_MAXIMO_IMAGEN) throw new AppError("La imagen supera los 2 MB.", 413)

    const tipo = detectarTipoImagen(datos)
    if (!tipo) throw new AppError("Formato de imagen no soportado. Usa JPG, PNG, WebP o GIF.", 415)

    const imagen = await Imagen.create({
        usuario: usuarioId,
        datos,
        tipo,
        tamano: datos.length,
    })

    return imagen._id
}

// Devuelve una imagen solo si pertenece al usuario. Si no es suya, responde 404
// (no 403) para no revelar que la imagen existe.
export const obtenerImagenService = async (usuarioId: string, imagenId: string): Promise<ImagenGuardada> => {

    const imagen = await Imagen.findOne({ _id: imagenId, usuario: usuarioId })
    if (!imagen) throw new AppError("Imagen no encontrada", 404)

    return { datos: imagen.datos, tipo: imagen.tipo }
}

// Borra imágenes del usuario (al eliminar tarjetas, temas o asignaturas). Ignora ids vacíos.
export const eliminarImagenesService = async (usuarioId: string, ids: Array<Types.ObjectId | string | null | undefined>): Promise<void> => {

    const validos = ids.filter((id): id is Types.ObjectId | string => !!id && isValidObjectId(id))
    if (validos.length === 0) return

    await Imagen.deleteMany({ _id: { $in: validos }, usuario: usuarioId })
}

// ==========================================
// IMAGEN DE UNA TARJETA EXISTENTE (cambiar / quitar)
// ==========================================

// Busca la tarjeta en cualquier asignatura, tema y caja del usuario.
function buscarTarjeta(usuario: UsuarioDocument, tarjetaId: string): TarjetaSubdocument | null {
    for (const asignatura of usuario.asignaturas) {
        for (const tema of asignatura.temas) {
            for (const caja of tema.cajas) {
                const tarjeta = caja.tarjetas.id(tarjetaId)
                if (tarjeta) return tarjeta
            }
        }
    }
    return null
}

export async function cargarTarjeta(usuarioId: string, tarjetaId: string) {
    const usuario: UsuarioDocument | null = await Usuario.findById(usuarioId)
    if (!usuario) throw new AppError("Usuario no encontrado", 404)

    const tarjeta = buscarTarjeta(usuario, tarjetaId)
    if (!tarjeta) throw new AppError("Tarjeta no encontrada", 404)

    return { usuario, tarjeta }
}

// Agrega una imagen a la tarjeta o reemplaza la que tenía. Devuelve la tarjeta actualizada.
// Orden seguro: primero se guarda la imagen nueva, luego la tarjeta, y recién al final
// se borra la anterior. Si algo falla en el medio, la tarjeta conserva su imagen original.
export const reemplazarImagenTarjetaService = async (usuarioId: string, tarjetaId: string, datos: Buffer): Promise<ITarjeta> => {

    const { usuario, tarjeta } = await cargarTarjeta(usuarioId, tarjetaId)
    const anterior = tarjeta.imagen ?? null

    const nueva = await guardarImagenService(usuarioId, datos)

    try {
        tarjeta.imagen = nueva
        await usuario.save()
    } catch (error) {
        await eliminarImagenesService(usuarioId, [nueva])
        throw error
    }

    await eliminarImagenesService(usuarioId, [anterior])
    return tarjeta.toObject()
}

// Quita la imagen de la tarjeta y la borra. Devuelve la tarjeta actualizada.
export const eliminarImagenTarjetaService = async (usuarioId: string, tarjetaId: string): Promise<ITarjeta> => {

    const { usuario, tarjeta } = await cargarTarjeta(usuarioId, tarjetaId)

    const anterior = tarjeta.imagen ?? null
    if (!anterior) throw new AppError("La tarjeta no tiene imagen", 404)

    tarjeta.imagen = null
    await usuario.save()

    await eliminarImagenesService(usuarioId, [anterior])
    return tarjeta.toObject()
}
