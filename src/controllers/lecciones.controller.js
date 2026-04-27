import Usuario from "../models/Usuarios.js"
import { crearLeccionDB } from "../services/lecciones.service.js"

// GET /api/cajas/
// Retorna todas las lecciones del usuario
const cargarLecciones = async (req, res) => {
    
    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        return res.status(200).json(usuario.lecciones)

    } catch (error) {
        console.error('Error al cargar lecciones:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las lecciones del usuario' })
    }
}

// GET /api/cajas/leccion/:leccionId
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

// POST /api/cajas/leccion
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
        const leccionGuardada = await crearLeccionDB(nombreLeccion, usuario_id)
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

// PUT /api/cajas/leccion/:leccionId
// Actualiza las cajas de una lección (llamado al presionar "Guardar")
const actualizarCajasDeLeccion = async (req, res) => {
    const { leccionId } = req.params
    const cajasNuevas = req.body

    if (!Array.isArray(cajasNuevas) || cajasNuevas.length !== 5) {
        return res.status(400).json({ mensaje: "Se esperan exactamente 5 cajas" })
    }

    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        const leccion = usuario.lecciones.id(leccionId)
        if (!leccion) return res.status(404).json({ mensaje: "Lección no encontrada" })

        leccion.cajas = cajasNuevas
        await usuario.save()

        return res.status(200).json({ mensaje: "Cajas actualizadas correctamente", cajas: leccion.cajas })
    } catch (error) {
        console.error("Error al actualizar cajas:", error)
        return res.status(500).json({ mensaje: "Error interno al actualizar" })
    }
}

// DELETE /api/cajas/leccion/:leccionId
// Elimina una lección completa
const eliminarLeccion = async (req, res) => {
    const { leccionId } = req.params

    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        const leccion = usuario.lecciones.id(leccionId)
        if (!leccion) return res.status(404).json({ mensaje: "Lección no encontrada" })

        leccion.deleteOne()
        await usuario.save()

        return res.status(200).json({ mensaje: "Lección eliminada correctamente" })
    } catch (error) {
        console.error("Error al eliminar lección:", error)
        return res.status(500).json({ mensaje: "Error interno al eliminar" })
    }
}

// POST /api/cajas/leccion/:leccionId/tarjeta
// Agrega una tarjeta nueva a la caja 1 de una lección
const crearTarjeta = async (req, res) => {
    const { pregunta, respuesta, nivel, ultima_revision, proxima_revision } = req.body
    const { leccionId } = req.params

    try {
        const usuario = await Usuario.findById(req.usuario.id)
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" })

        const leccion = usuario.lecciones.id(leccionId)
        if (!leccion) return res.status(404).json({ mensaje: "Lección no encontrada" })

        const nuevaTarjeta = { pregunta, respuesta, nivel, ultima_revision, proxima_revision }
        leccion.cajas[0].tarjetas.push(nuevaTarjeta)

        await usuario.save()
        return res.status(200).json({ mensaje: "Tarjeta agregada correctamente" })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ mensaje: "Error en el servidor" })
    }
}

export {
    cargarLecciones,
    cargarCajasDeLeccion,
    crearLeccion,
    actualizarCajasDeLeccion,
    eliminarLeccion,
    crearTarjeta,
}
