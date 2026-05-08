import { eliminarLeccion } from "../controllers/lecciones.controller.js"
import Leccion from "../models/Leccion.js"
import Usuario from "../models/Usuarios.js"

// ==========================
// DOMAIN reglas del sistema
// ==========================

function crearCajasVacias() {
    console.log("estamos en crear cajas vacías")
    return [
        { nombre: "Caja 1", tarjetas: [] },
        { nombre: "Caja 2", tarjetas: [] },
        { nombre: "Caja 3", tarjetas: [] },
        { nombre: "Caja 4", tarjetas: [] },
        { nombre: "Caja 5", tarjetas: [] },
    ]
}

function crearNuevaTarjeta(pregunta, respuesta) {

    const fechaActual = new Date()
    const proxima_revision = new Date(fechaActual)
    proxima_revision.setDate(proxima_revision.getDate() + 1)

    const nuevaTarjeta = {
        pregunta: pregunta,
        respuesta: respuesta,
        nivel: 1,
        ultima_revision: new Date(),
        proxima_revision: proxima_revision,
        es_correcta: null
    }

    return nuevaTarjeta

}

function ordenarTarjetasEnCajas(datos_tarjetas) {
    console.log("Datos tarjetas en ordenar tarjetas: ", datos_tarjetas)
    return datos_tarjetas

}

// =======================================
// SERVICES controladores de persistencia
// =======================================

// SERVICIO DE LECCIONES

export const createLectionService = async (nombreLeccion, usuario_id) => {

    try {
        const usuario = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado")

        const nombreDuplicado = usuario.lecciones.some(
            l => l.nombre.toLowerCase() === nombreLeccion.trim().toLowerCase()
        )

        if (nombreDuplicado) {
            throw new Error("Ya existe una lección con ese nombre")
        }

        const nuevaLeccion = {
            nombre: nombreLeccion.trim(),
            cajas: crearCajasVacias()
        }
        console.log("nueva lección: ", nuevaLeccion)
        usuario.lecciones.push(nuevaLeccion)
        console.log("usuario: ", usuario)
        await usuario.save()

        return usuario.lecciones[usuario.lecciones.length - 1]

    } catch (error) {
        console.error(error)
        throw error

    }

}

export const getUserLectionsService = async (usuario_id) => {
    try {
        const usuario = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado")

        return usuario.lecciones

    } catch (error) {
        throw new Error(`Error al cargar las lecciones del usuario: ${error}`)
    }
}

export const deleteLeccionService = async (usuario_id, leccion_id) => {

    try {
        const usuario = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado")

        const leccion = usuario.lecciones.id(leccion_id)

        if (!leccion) throw new Error("Lección no encontrada.")

        await leccion.deleteOne()
        await usuario.save()

        return { mensaje: "Lección eliminada correctamente" }

    } catch (error) {
        throw new Error("Error al eliminar la lección: " + error.message)

    }

}

// SERVICIOS DE TARJETAS

export const createCardService = async (usuarioId, leccionId, tarjetaDatos) => {

    const { pregunta, respuesta } = tarjetaDatos
    console.log("leccion id: ", leccionId)
    console.log("usuario id: ", usuarioId)
    console.log("datos de la tarjeta: ", tarjetaDatos)

    try {
        const usuario = await Usuario.findById(usuarioId)
        if (!usuario) throw new Error("Usuario no encontrado.")

        const leccion = usuario.lecciones.id(leccionId)
        if (!leccion) throw new Error("Lección no encontrada.")

        const nuevaTarjeta = crearNuevaTarjeta(pregunta, respuesta)
        leccion.cajas[0].tarjetas.push(nuevaTarjeta)

        await usuario.save()
        const tarjetas = leccion.cajas[0].tarjetas
        return tarjetas[tarjetas.length - 1]

    } catch (error) {
        console.error(error)
        throw error

    }

}

export const updateBoxesService = async (usuarioId, leccionId, datosTarjetas) => {

    console.log("Datos tarjetas: ", datosTarjetas)

    try {
        const cajasNuevas = datosTarjetas.cajas
        if (!Array.isArray(cajasNuevas) || cajasNuevas.length !== 5) throw new Error("Se esperan exactamente 5 cajas")
        const usuario = await Usuario.findById(usuarioId)
        if (!usuario) throw new Error("Usuario no encontrado")

        const leccion = usuario.lecciones.id(leccionId)
        if (!leccion) throw new Error("Lección no encontrada")

        const cajasOrdenadas = ordenarTarjetasEnCajas(datosTarjetas)
        leccion.cajas = cajasOrdenadas
        await usuario.save()

        return leccion.cajas

    } catch (error) {
        throw new Error("Error interno al actualizar")

    }

}

export const deleteCardService = async (usuarioId, tarjetaId) => {

    try {
        const resultado = await Usuario.updateOne(
            { _id: usuarioId },
            { $pull: { "lecciones.$[].cajas.$[].tarjetas": { _id: tarjetaId } } }
        )

        if (resultado.modifiedCount === 0) throw new Error("Tarjeta no encontrada")

        return resultado

    } catch (error) {
        throw new Error("Error al eliminar la tarjeta: " + error.message)

    }

}
