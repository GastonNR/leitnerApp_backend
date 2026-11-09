import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { createCardService, deleteCardService, updateCardService } from "../services/tarjetas.service.js"
import type { CrearTarjetaBody, EditarTarjetaBody, TarjetaParams, TemaParams } from "../types/estudio.types.js"
import { responderError } from "../utils/responderError.js"

const idInvalido = (res: Response, que: string): Response =>
    res.status(400).json({ ok: false, message: `ID de ${que} inválido` })

const noAutorizado = (res: Response): Response =>
    res.status(401).json({ ok: false, message: "No autorizado" })

// POST /api/temas/:temaId/tarjetas  (JSON o multipart con "imagen" opcional)
// Agrega una tarjeta nueva a la caja 1 del tema.
const crearTarjeta = async (req: Request<TemaParams, {}, CrearTarjetaBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { temaId } = req.params
    if (!isValidObjectId(temaId)) return idInvalido(res, 'tema')

    const { pregunta, respuesta } = req.body ?? {}

    try {
        const tarjeta = await createCardService(req.usuario.id, temaId, { pregunta, respuesta }, req.file?.buffer)
        return res.status(201).json(tarjeta)
    } catch (error) {
        return responderError(res, error, "Error al crear la tarjeta")
    }
}

// PATCH /api/tarjetas/:tarjetaId  (JSON o multipart)
// Edita texto e imagen; el progreso no cambia.
const editarTarjeta = async (req: Request<TarjetaParams, {}, EditarTarjetaBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { tarjetaId } = req.params
    if (!isValidObjectId(tarjetaId)) return idInvalido(res, 'tarjeta')

    const { pregunta, respuesta, quitarImagen } = req.body ?? {}

    try {
        const tarjeta = await updateCardService(
            req.usuario.id,
            tarjetaId,
            { pregunta, respuesta, quitarImagen: quitarImagen === true || quitarImagen === 'true' },
            req.file?.buffer
        )
        return res.json(tarjeta)
    } catch (error) {
        return responderError(res, error, "Error al editar la tarjeta")
    }
}

// DELETE /api/tarjetas/:tarjetaId
const eliminarTarjeta = async (req: Request<TarjetaParams>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { tarjetaId } = req.params
    if (!isValidObjectId(tarjetaId)) return idInvalido(res, 'tarjeta')

    try {
        await deleteCardService(req.usuario.id, tarjetaId)
        return res.sendStatus(204)
    } catch (error) {
        return responderError(res, error, "Error al eliminar la tarjeta")
    }
}

export { crearTarjeta, editarTarjeta, eliminarTarjeta }
