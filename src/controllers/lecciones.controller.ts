import { Request, Response, RequestHandler } from "express"
import Usuario from "../models/Usuarios.js"
import {
    createLectionService,
    createCardService,
    deleteLeccionService,
    getUserLectionsService,
    updateBoxesService,
    deleteCardService
} from "../services/lecciones.service.js"
import { ILeccion } from "../types/models.types.js"
import type {
    ActualizarCajasDeLeccionBody,
    CargarCajasDeLeccionParams,
    CrearLeccionBody,
    CrearTarjetaBody,
    CrearTarjetaParams,
    EliminarLeccionParams,
    EliminarTarjetaParams
} from "../types/lecciones.types.js"
import { Types } from "mongoose"

// GET /api/lecciones/
// Retorna todas las lecciones del usuario
const cargarLecciones = async (req: Request, res: Response): Promise<Response> => {
    console.log("estamos en cargar lecciones.")
    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    try {
        const lecciones: ILeccion[] = await getUserLectionsService(req.usuario.id)
        if (!lecciones) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        return res.status(200).json(lecciones)

    } catch (error) {
        console.error('Error al cargar lecciones:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las lecciones del usuario' })
    }
}

// GET /api/lecciones/leccion/:leccionId
// Retorna las cajas de una lección específica
const cargarCajasDeLeccion = async (req: Request<CargarCajasDeLeccionParams>, res: Response): Promise<Response> => {

    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        //const leccion = usuario.lecciones.id(req.params.leccionId)
        const leccion = usuario.lecciones.find(leccion => leccion._id?.toString() === req.params.leccionId)
        if (!leccion) return res.status(404).json({ mensaje: "Lección no encontrada" })

        return res.status(200).json(leccion.cajas)
    } catch (error) {
        console.error('Error al cargar cajas:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las cajas' })
    }
}

// POST /api/lecciones/leccion
// Crea una nueva lección con 5 cajas vacías
const crearLeccion = async (req: Request<{}, {}, CrearLeccionBody>, res: Response): Promise<Response> => {

    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    const nombreLeccion: string = req.body.nuevaLeccion
    const usuario_id: string = req.usuario.id

    if (!nombreLeccion || !nombreLeccion.trim()) {
        return res.status(400).json({ mensaje: "El nombre de la lección es requerido" })
    }

    try {
        const leccionGuardada: ILeccion = await createLectionService(nombreLeccion, usuario_id)
        return res.status(201).json({
            ok: true,
            nuevaLeccion: leccionGuardada
        })

    } catch (error) {
        if(error instanceof Error){
            if (error.message === "Ya existe una lección con ese nombre") {
                return res.status(409).json({ mensaje: error.message })
            }
    
            if (error.message === "Usuario no encontrado") {
                return res.status(404).json({ mensaje: error.message })
            }
        }

        console.error(error)
        return res.status(500).json({ mensaje: "Error interno del servidor."})
    }

}

// PUT /api/lecciones/leccion/:id
// Actualiza las cajas de una lección (llamado al presionar "Guardar")
const actualizarCajasDeLeccion = async (req: Request<{}, {}, ActualizarCajasDeLeccionBody>, res: Response): Promise<Response> => {

    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})
  
    const {_id, cajas, nombre} = req.body
    const datosTarjetas: ILeccion = {
        _id: new Types.ObjectId(_id),
        nombre: nombre,
        cajas: cajas
    }

    try {
        const cajas_ordenadas = await updateBoxesService(
            req.usuario.id,
            datosTarjetas
        )

        return res.status(200).json(cajas_ordenadas)

    } catch (error) {
        console.error("Error al actualizar cajas:", error)
        return res.status(500).json({ mensaje: "Error interno al actualizar" })

    }
    
}

// DELETE /api/cajas/leccion/:leccionId
// Elimina una lección completa
const eliminarLeccion = async (req: Request<EliminarLeccionParams>, res: Response): Promise<Response> => {

    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    const { id } = req.params
    const usuario_id  = req.usuario.id

    console.log("id: ", id)

    try {
        await deleteLeccionService(usuario_id, id)

        return res.status(200).json({
            ok: true,
            mensaje: "Lección eliminada." 
        })

    } catch (error) {
        console.error("Error al eliminar lección:", error)
        return res.status(500).json({ mensaje: "Error interno al eliminar" })

    }
}

// POST /api/cajas/leccion/:leccionId/tarjeta
// Agrega una tarjeta nueva a la caja 1 de una lección
const crearTarjeta = async (req: Request<CrearTarjetaParams, {}, CrearTarjetaBody>, res: Response): Promise<Response> => {
    
    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    const usuario_id = req.usuario.id
    const {leccion_id} = req.params
    const {pregunta, respuesta} = req.body
    const datos_tarjeta = {
        pregunta: pregunta,
        respuesta: respuesta
    }

    try {
        const tarjetaGuardada = await createCardService(
            usuario_id,
            leccion_id,
            datos_tarjeta
        )
        
        return res.status(200).json(tarjetaGuardada)

    } catch (error) {
        console.error(error)
        return res.status(500).json({ mensaje: "Error en el servidor" })

    }
}

// DELETE /api/leccion/:tarjeta_id
// Eliminar tarjeta
const eliminarTarjeta = async (req: Request<EliminarTarjetaParams>, res: Response): Promise<Response> => {

    if(!req.usuario) return res.status(401).json({mensaje: "No autorizado"})

    const usuarioId = req.usuario.id
    const { tarjetaId } = req.params

    try {
        await deleteCardService(usuarioId, tarjetaId)
        return res.sendStatus(204)

    } catch (error){
        return res.status(500).json({menssage: `Error al eliminar la tarjeta: ${error}`})
    }

}

export {
    cargarLecciones,
    cargarCajasDeLeccion,
    crearLeccion,
    actualizarCajasDeLeccion,
    eliminarLeccion,
    crearTarjeta,
    eliminarTarjeta,
    //guardarLeccion
}
