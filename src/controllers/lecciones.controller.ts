import { Request, Response } from "express"
import { isValidObjectId, Types } from "mongoose"
import {
    createLectionService,
    createCardService,
    deleteLeccionService,
    getUserLectionsService,
    updateBoxesService,
    deleteCardService,
    updateCardService
} from "../services/lecciones.service.js"
import { ILeccion } from "../types/models.types.js"
import type {
    ActualizarCajasDeLeccionBody,
    CrearLeccionBody,
    CrearTarjetaBody,
    CrearTarjetaParams,
    EliminarLeccionParams,
    EliminarTarjetaParams,
    EditarTarjetaBody,
    EditarTarjetaParams
} from "../types/lecciones.types.js"
import { responderError } from "../utils/responderError.js"

const idInvalido = (res: Response, que: string): Response =>
    res.status(400).json({ ok: false, message: `ID de ${que} inválido` })

// GET /api/lecciones/
// Retorna todas las lecciones del usuario
const cargarLecciones = async (req: Request, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    try {
        const lecciones: ILeccion[] = await getUserLectionsService(req.usuario.id)
        return res.status(200).json(lecciones)

    } catch (error) {
        return responderError(res, error, 'Error al cargar las lecciones del usuario')
    }
}

// POST /api/lecciones/leccion
// Crea una nueva lección con 5 cajas vacías
const crearLeccion = async (req: Request<{}, {}, CrearLeccionBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const nombreLeccion = req.body?.nuevaLeccion

    if (typeof nombreLeccion !== 'string' || !nombreLeccion.trim()) {
        return res.status(400).json({ ok: false, message: "El nombre de la lección es requerido" })
    }

    try {
        const leccionGuardada: ILeccion = await createLectionService(nombreLeccion, req.usuario.id)
        return res.status(201).json({
            ok: true,
            nuevaLeccion: leccionGuardada
        })

    } catch (error) {
        return responderError(res, error, "Error interno del servidor.")
    }

}

// PUT /api/lecciones/leccion
// Guarda la sesión de estudio y reordena las tarjetas (algoritmo Leitner)
const actualizarCajasDeLeccion = async (req: Request<{}, {}, ActualizarCajasDeLeccionBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { _id, cajas } = req.body ?? {}
    if (!isValidObjectId(_id)) return idInvalido(res, 'lección')

    try {
        const leccion = await updateBoxesService(req.usuario.id, {
            _id: new Types.ObjectId(_id),
            cajas
        })

        return res.status(200).json(leccion)

    } catch (error) {
        return responderError(res, error, "Error interno al actualizar")
    }

}

// DELETE /api/lecciones/:id
// Elimina una lección completa
const eliminarLeccion = async (req: Request<EliminarLeccionParams>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { id } = req.params
    if (!isValidObjectId(id)) return idInvalido(res, 'lección')

    try {
        await deleteLeccionService(req.usuario.id, id)

        return res.status(200).json({
            ok: true,
            mensaje: "Lección eliminada."
        })

    } catch (error) {
        return responderError(res, error, "Error interno al eliminar")
    }
}

// POST /api/lecciones/leccion/:leccion_id
// Agrega una tarjeta nueva a la caja 1 de una lección
const crearTarjeta = async (req: Request<CrearTarjetaParams, {}, CrearTarjetaBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { leccion_id } = req.params
    if (!isValidObjectId(leccion_id)) return idInvalido(res, 'lección')

    const { pregunta, respuesta } = req.body ?? {}

    try {
        const tarjetaGuardada = await createCardService(req.usuario.id, leccion_id, { pregunta, respuesta }, req.file?.buffer)
        return res.status(201).json(tarjetaGuardada)

    } catch (error) {
        return responderError(res, error, "Error en el servidor")
    }
}

// DELETE /api/lecciones/leccion/:tarjetaId
// Elimina una tarjeta
const eliminarTarjeta = async (req: Request<EliminarTarjetaParams>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const { tarjetaId } = req.params
    if (!isValidObjectId(tarjetaId)) return idInvalido(res, 'tarjeta')

    try {
        await deleteCardService(req.usuario.id, tarjetaId)
        return res.sendStatus(204)

    } catch (error) {
        return responderError(res, error, "Error al eliminar la tarjeta")
    }

}

const editarTarjeta = async (req: Request<EditarTarjetaParams, {}, EditarTarjetaBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

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

export {
    cargarLecciones,
    crearLeccion,
    actualizarCajasDeLeccion,
    eliminarLeccion,
    crearTarjeta,
    eliminarTarjeta,
    editarTarjeta,
}
