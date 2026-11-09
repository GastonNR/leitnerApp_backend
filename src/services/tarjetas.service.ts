import Usuario from "../models/Usuarios.js"
import { TARJETAS_POR_USUARIO_MAX, TEXTO_TARJETA_MAX } from "../config/limites.js"
import { AppError } from "../types/AppError.js"
import { TarjetaDTO } from "../types/estudio.types.js"
import { ITarjeta } from "../types/models.types.js"
import { buscarTema, buscarUsuario } from "./buscar.js"
import { cargarTarjeta, eliminarImagenesService, guardarImagenService } from "./imagenes.service.js"
import { crearNuevaTarjeta } from "./leitner.js"

// Texto de pregunta/respuesta: sin espacios en los bordes y con saltos de línea
// "\n" (los formularios multipart del navegador los envían como "\r\n").
function limpiarTexto(texto: unknown): string {
    return typeof texto === 'string' ? texto.replace(/\r\n?/g, '\n').trim() : ''
}

// Pregunta y respuesta limpias, o un 400 si falta alguna o es demasiado larga.
function leerTextos(datos: TarjetaDTO): { pregunta: string, respuesta: string } {
    const pregunta = limpiarTexto(datos.pregunta)
    const respuesta = limpiarTexto(datos.respuesta)
    if (!pregunta || !respuesta) throw new AppError("La pregunta y la respuesta son obligatorias.", 400)
    if (pregunta.length > TEXTO_TARJETA_MAX || respuesta.length > TEXTO_TARJETA_MAX) {
        throw new AppError(`La pregunta y la respuesta no pueden superar los ${TEXTO_TARJETA_MAX} caracteres.`, 400)
    }
    return { pregunta, respuesta }
}

// Agrega una tarjeta a la caja 1 de un tema, con imagen opcional.
export const createCardService = async (usuarioId: string, temaId: string, tarjetaDatos: TarjetaDTO, imagen?: Buffer): Promise<ITarjeta> => {

    const { pregunta, respuesta } = leerTextos(tarjetaDatos)

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    const total = usuario.asignaturas.reduce((n, a) =>
        n + a.temas.reduce((m, t) => m + t.cajas.reduce((k, c) => k + c.tarjetas.length, 0), 0), 0)
    if (total >= TARJETAS_POR_USUARIO_MAX) {
        throw new AppError(`Llegaste al máximo de ${TARJETAS_POR_USUARIO_MAX} tarjetas.`, 400)
    }

    // La imagen se guarda primero; si la tarjeta no llega a guardarse, se borra
    // para no dejar imágenes huérfanas.
    const imagenId = imagen ? await guardarImagenService(usuarioId, imagen) : null

    try {
        tema.cajas[0].tarjetas.push(crearNuevaTarjeta(pregunta, respuesta, imagenId))
        await usuario.save()
    } catch (error) {
        await eliminarImagenesService(usuarioId, [imagenId])
        throw error
    }

    const tarjetas = tema.cajas[0].tarjetas
    return tarjetas[tarjetas.length - 1].toObject()
}

export interface EdicionTarjeta extends TarjetaDTO {
    quitarImagen?: boolean
}

// Cambia el texto de una tarjeta y, opcionalmente, su imagen (nueva o quitarla).
// No toca el progreso: la tarjeta sigue en su caja, con su nivel y sus fechas.
// Orden seguro: primero la imagen nueva, luego la tarjeta y recién al final
// se borra la anterior.
export const updateCardService = async (usuarioId: string, tarjetaId: string, datos: EdicionTarjeta, imagen?: Buffer): Promise<ITarjeta> => {

    const { pregunta, respuesta } = leerTextos(datos)

    const { usuario, tarjeta } = await cargarTarjeta(usuarioId, tarjetaId)
    const anterior = tarjeta.imagen ?? null
    const cambiaImagen = !!imagen || !!datos.quitarImagen

    const nueva = imagen ? await guardarImagenService(usuarioId, imagen) : null

    try {
        tarjeta.pregunta = pregunta
        tarjeta.respuesta = respuesta
        if (cambiaImagen) tarjeta.imagen = nueva
        await usuario.save()
    } catch (error) {
        await eliminarImagenesService(usuarioId, [nueva])
        throw error
    }

    if (cambiaImagen) await eliminarImagenesService(usuarioId, [anterior])
    return tarjeta.toObject()
}

// Un id de tarjeta no dice en qué asignatura, tema ni caja está: se borra con un
// $pull posicional sobre todas.
export const deleteCardService = async (usuarioId: string, tarjetaId: string): Promise<void> => {

    // Antes del $pull se busca la imagen de la tarjeta, para borrarla también.
    const usuario = await Usuario.findOne(
        { _id: usuarioId, "asignaturas.temas.cajas.tarjetas._id": tarjetaId },
        { "asignaturas.temas.cajas.tarjetas._id": 1, "asignaturas.temas.cajas.tarjetas.imagen": 1 }
    ).lean()
    const tarjeta = usuario?.asignaturas
        .flatMap(a => a.temas).flatMap(t => t.cajas).flatMap(c => c.tarjetas)
        .find(t => t._id?.toString() === tarjetaId)

    const resultado = await Usuario.updateOne(
        { _id: usuarioId },
        { $pull: { "asignaturas.$[].temas.$[].cajas.$[].tarjetas": { _id: tarjetaId } } }
    )

    if (resultado.modifiedCount === 0) throw new AppError("Tarjeta no encontrada", 404)

    await eliminarImagenesService(usuarioId, [tarjeta?.imagen])
}
