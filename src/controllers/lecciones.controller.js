import Usuario from "../models/Usuarios.js"
import {
    createLectionService,
    createCardService,
    deleteLeccionService,
    getUserLectionsService,
    updateBoxesService,
    deleteCardService
} from "../services/lecciones.service.js"

// GET /api/lecciones/
// Retorna todas las lecciones del usuario
const cargarLecciones = async (req, res) => {

    console.log("req.usuario.id: ", req.usuario.id)
    
    try {
        const lecciones = await getUserLectionsService(req.usuario.id)
        if (!lecciones) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        return res.status(200).json(lecciones)

    } catch (error) {
        console.error('Error al cargar lecciones:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las lecciones del usuario' })
    }
}

// GET /api/lecciones/leccion/:leccionId
// Retorna las cajas de una lección específica
const cargarCajasDeLeccion = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        const leccion = usuario.lecciones.id(req.params.leccionId)
        if (!leccion) return res.status(404).json({ mensaje: "Lección no encontrada" })

        return res.status(200).json(leccion.cajas)
    } catch (error) {
        console.error('Error al cargar cajas:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las cajas' })
    }
}

// POST /api/lecciones/leccion
// Crea una nueva lección con 5 cajas vacías
const crearLeccion = async (req, res) => {

    console.log("req.usuario", req.usuario)
    console.log("Body: ", req.body.nuevaLeccion)

    const nombreLeccion = req.body.nuevaLeccion
    const usuario_id = req.usuario.id

    if (!nombreLeccion || !nombreLeccion.trim()) {
        return res.status(400).json({ mensaje: "El nombre de la lección es requerido" })
    }

    try {
        const leccionGuardada = await createLectionService(nombreLeccion, usuario_id)
        return res.status(201).json(leccionGuardada)

    } catch (error) {
        
        if (error.message === "Ya existe una lección con ese nombre") {
            return res.status(409).json({ mensaje: error.message })
        }

        if (error.message === "Usuario no encontrado") {
            return res.status(404).json({ mensaje: error.message })
        }

        console.error(error)
        return res.status(500).json({ mensaje: "Error interno del servidor."})
    }

}

// PUT /api/lecciones/leccion/:id
// Actualiza las cajas de una lección (llamado al presionar "Guardar")
const actualizarCajasDeLeccion = async (req, res) => {
    const leccionId = req.params
    const datos_tarjetas = req.body

    try {
        const cajas_ordenadas = await updateBoxesService(
            req.usuario.id,
            leccionId,
            datos_tarjetas
        )

        return res.status(200).json(cajas_ordenadas)

    } catch (error) {
        console.error("Error al actualizar cajas:", error)
        return res.status(500).json({ mensaje: "Error interno al actualizar" })

    }
    
}

// DELETE /api/cajas/leccion/:leccionId
// Elimina una lección completa
const eliminarLeccion = async (req, res) => {

    const { id } = req.params
    const usuario_id  = req.usuario.id

    console.log("id: ", id)

    try {
        await deleteLeccionService(usuario_id, id)

        return res.status(200).json({ mensaje: "Lección eliminada correctamente" })

    } catch (error) {
        console.error("Error al eliminar lección:", error)
        return res.status(500).json({ mensaje: "Error interno al eliminar" })

    }
}
// PUT /api/lecciones/:leccionId
// Guarda las lecciones después de que el usuario haya respondido todas las preguntas.
const guardarLeccion = async (req, res) => {

    const usuarioId = req.usuario.id
    const { leccionId } = req.params
    const datosTarjetas = req.body

    try {
        const leccionOrdenada = updateBoxesService(usuarioId, leccionId, datosTarjetas)
        return res.status(200).json(leccionOrdenada)

    } catch (error) {
        res.status(500).json({message: "Error al guardar los datos de la lección."})

    }

}

// POST /api/cajas/leccion/:leccionId/tarjeta
// Agrega una tarjeta nueva a la caja 1 de una lección
const crearTarjeta = async (req, res) => {

    const usuario_id = req.usuario.id
    const {leccion_id} = req.params
    const {pregunta, respuesta} = req.body
    const datos_tarjeta = {
        pregunta: pregunta,
        respuesta: respuesta
    }

    console.log("usuario id desde request: ", req.usuario.id)
    console.log("Datos de la targeta: ", pregunta, respuesta)

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
const eliminarTarjeta = async (req, res) => {

    const usuarioId = req.usuario.id
    const { tarjetaId } = req.params

    console.log("Usuario id: ", usuarioId)
    console.log("tarjeta id: ", tarjetaId)
    

    try {
        const cajasActualizadas = deleteCardService(usuarioId, tarjetaId)
        return res.status(200).json(cajasActualizadas)

    } catch (error){
        res.status(500).json({menssage: `Error al eliminar la tarjeta: ${error}`})
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
    guardarLeccion
}
