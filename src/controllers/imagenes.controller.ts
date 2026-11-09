import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import {
    eliminarImagenTarjetaService,
    obtenerImagenService,
    reemplazarImagenTarjetaService
} from "../services/imagenes.service.js"
import { responderError } from "../utils/responderError.js"

// GET /api/imagenes/:id
// Devuelve los bytes de una imagen del usuario autenticado.
const obtenerImagen = async (req: Request<{ id: string }>, res: Response): Promise<Response | void> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { id } = req.params
    if (!isValidObjectId(id)) return res.status(400).json({ ok: false, message: "ID de imagen inválido" })

    try {
        const { datos, tipo } = await obtenerImagenService(req.usuario.id, id)

        res.set({
            'Content-Type': tipo,
            'Content-Length': String(datos.length),
            // Una imagen nunca cambia (reemplazarla crea otra con otro id).
            'Cache-Control': 'private, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        })
        return res.status(200).send(datos)

    } catch (error) {
        return responderError(res, error, "Error al cargar la imagen")
    }
}

// PUT /api/imagenes/tarjeta/:tarjetaId  (multipart/form-data, campo "imagen")
// Agrega o reemplaza la imagen de una tarjeta existente. Devuelve la tarjeta.
const reemplazarImagenTarjeta = async (req: Request<{ tarjetaId: string }>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { tarjetaId } = req.params
    if (!isValidObjectId(tarjetaId)) return res.status(400).json({ ok: false, message: "ID de tarjeta inválido" })

    if (!req.file) return res.status(400).json({ ok: false, message: 'Falta la imagen (campo "imagen").' })

    try {
        const tarjeta = await reemplazarImagenTarjetaService(req.usuario.id, tarjetaId, req.file.buffer)
        return res.status(200).json(tarjeta)

    } catch (error) {
        return responderError(res, error, "Error al guardar la imagen")
    }
}

// DELETE /api/imagenes/tarjeta/:tarjetaId
// Quita la imagen de una tarjeta y la borra. Devuelve la tarjeta.
const eliminarImagenTarjeta = async (req: Request<{ tarjetaId: string }>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { tarjetaId } = req.params
    if (!isValidObjectId(tarjetaId)) return res.status(400).json({ ok: false, message: "ID de tarjeta inválido" })

    try {
        const tarjeta = await eliminarImagenTarjetaService(req.usuario.id, tarjetaId)
        return res.status(200).json(tarjeta)

    } catch (error) {
        return responderError(res, error, "Error al eliminar la imagen")
    }
}

export { obtenerImagen, reemplazarImagenTarjeta, eliminarImagenTarjeta }
