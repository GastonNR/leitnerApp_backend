import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import {
    createAsignaturaService,
    createTemaService,
    deleteAsignaturaService,
    deleteTemaService,
    getAsignaturasService,
    guardarSesionService,
    renameAsignaturaService,
    renameTemaService,
    moveTemaService
} from "../services/asignaturas.service.js"
import type { AsignaturaParams, GuardarSesionBody, MoverTemaBody, NombreBody, TemaParams } from "../types/estudio.types.js"
import { responderError } from "../utils/responderError.js"

const idInvalido = (res: Response, que: string): Response =>
    res.status(400).json({ ok: false, message: `ID de ${que} inválido` })

const noAutorizado = (res: Response): Response =>
    res.status(401).json({ ok: false, message: "No autorizado" })

// Nombre recortado, o null si no es un texto con contenido.
function nombreValido(nombre: unknown): string | null {
    return typeof nombre === 'string' && nombre.trim() ? nombre.trim() : null
}

// GET /api/asignaturas
// Todas las asignaturas del usuario, con sus temas, cajas y tarjetas.
const cargarAsignaturas = async (req: Request, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    try {
        return res.status(200).json(await getAsignaturasService(req.usuario.id))
    } catch (error) {
        return responderError(res, error, 'Error al cargar las asignaturas')
    }
}

// POST /api/asignaturas  { nombre }
// Crea una asignatura sin temas.
const crearAsignatura = async (req: Request<{}, {}, NombreBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const nombre = nombreValido(req.body?.nombre)
    if (!nombre) return res.status(400).json({ ok: false, message: "El nombre de la asignatura es requerido" })

    try {
        return res.status(201).json(await createAsignaturaService(req.usuario.id, nombre))
    } catch (error) {
        return responderError(res, error, "Error al crear la asignatura")
    }
}

// PATCH /api/asignaturas/:asignaturaId  { nombre }
// Renombra la asignatura.
const renombrarAsignatura = async (req: Request<AsignaturaParams, {}, NombreBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { asignaturaId } = req.params
    if (!isValidObjectId(asignaturaId)) return idInvalido(res, 'asignatura')

    const nombre = nombreValido(req.body?.nombre)
    if (!nombre) return res.status(400).json({ ok: false, message: "El nombre de la asignatura es requerido" })

    try {
        return res.json(await renameAsignaturaService(req.usuario.id, asignaturaId, nombre))
    } catch (error) {
        return responderError(res, error, "Error al renombrar la asignatura")
    }
}

// DELETE /api/asignaturas/:asignaturaId
// Borra la asignatura con todos sus temas y tarjetas.
const eliminarAsignatura = async (req: Request<AsignaturaParams>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { asignaturaId } = req.params
    if (!isValidObjectId(asignaturaId)) return idInvalido(res, 'asignatura')

    try {
        await deleteAsignaturaService(req.usuario.id, asignaturaId)
        return res.sendStatus(204)
    } catch (error) {
        return responderError(res, error, "Error al eliminar la asignatura")
    }
}

// POST /api/asignaturas/:asignaturaId/temas  { nombre }
// Crea un tema con 5 cajas vacías.
const crearTema = async (req: Request<AsignaturaParams, {}, NombreBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { asignaturaId } = req.params
    if (!isValidObjectId(asignaturaId)) return idInvalido(res, 'asignatura')

    const nombre = nombreValido(req.body?.nombre)
    if (!nombre) return res.status(400).json({ ok: false, message: "El nombre del tema es requerido" })

    try {
        return res.status(201).json(await createTemaService(req.usuario.id, asignaturaId, nombre))
    } catch (error) {
        return responderError(res, error, "Error al crear el tema")
    }
}

// PATCH /api/temas/:temaId  { nombre }
// Renombra el tema (sus cajas y tarjetas no cambian).
const renombrarTema = async (req: Request<TemaParams, {}, NombreBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { temaId } = req.params
    if (!isValidObjectId(temaId)) return idInvalido(res, 'tema')

    const nombre = nombreValido(req.body?.nombre)
    if (!nombre) return res.status(400).json({ ok: false, message: "El nombre del tema es requerido" })

    try {
        return res.json(await renameTemaService(req.usuario.id, temaId, nombre))
    } catch (error) {
        return responderError(res, error, "Error al renombrar el tema")
    }
}

// PATCH /api/temas/:temaId/asignatura  { asignaturaId }
// Mueve el tema (con sus tarjetas y progreso) a otra asignatura.
const moverTema = async (req: Request<TemaParams, {}, MoverTemaBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { temaId } = req.params
    if (!isValidObjectId(temaId)) return idInvalido(res, 'tema')

    const asignaturaId = req.body?.asignaturaId
    if (!isValidObjectId(asignaturaId)) return idInvalido(res, 'asignatura')

    try {
        return res.json(await moveTemaService(req.usuario.id, temaId, asignaturaId))
    } catch (error) {
        return responderError(res, error, "Error al mover el tema")
    }
}

// DELETE /api/temas/:temaId
const eliminarTema = async (req: Request<TemaParams>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { temaId } = req.params
    if (!isValidObjectId(temaId)) return idInvalido(res, 'tema')

    try {
        await deleteTemaService(req.usuario.id, temaId)
        return res.sendStatus(204)
    } catch (error) {
        return responderError(res, error, "Error al eliminar el tema")
    }
}

// PUT /api/temas/:temaId/cajas  { cajas }
// Guarda la sesión de estudio y reordena las tarjetas (algoritmo Leitner).
const guardarSesion = async (req: Request<TemaParams, {}, GuardarSesionBody>, res: Response): Promise<Response> => {

    if (!req.usuario) return noAutorizado(res)

    const { temaId } = req.params
    if (!isValidObjectId(temaId)) return idInvalido(res, 'tema')

    try {
        return res.status(200).json(await guardarSesionService(req.usuario.id, temaId, req.body?.cajas))
    } catch (error) {
        return responderError(res, error, "Error al guardar la sesión")
    }
}

export {
    cargarAsignaturas,
    crearAsignatura,
    renombrarAsignatura,
    eliminarAsignatura,
    crearTema,
    renombrarTema,
    moverTema,
    eliminarTema,
    guardarSesion,
}
