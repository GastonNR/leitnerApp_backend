import { eliminarLeccion } from "../controllers/lecciones.controller.js"
import Leccion from "../models/Leccion.js"
import Usuario from "../models/Usuarios.js"

function crearCajasVacias() {
    return [
        { nombre: "Caja 1", tarjetas: [] },
        { nombre: "Caja 2", tarjetas: [] },
        { nombre: "Caja 3", tarjetas: [] },
        { nombre: "Caja 4", tarjetas: [] },
        { nombre: "Caja 5", tarjetas: [] },
    ]
}

export const crearLeccionDB = async (nombreLeccion, usuario_id) => {

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

        usuario.lecciones.push(nuevaLeccion)
        await usuario.save()

        return usuario.lecciones[usuario.lecciones.length - 1]

    } catch (error) {
        throw error

    }

}

export const traerLeccionesUsuario = async (usuario_id) => {
    try {
        const usuario = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado")

        console.log("Lecciones del usuario encontradas desde el service: ", usuario.lecciones)

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

export const createCardService = async (usuario_id, leccion_id, tarjeta_datos) => {

    const { pregunta, respuesta } = tarjeta_datos
    console.log("Usuario id: ", usuario_id)
    console.log("leccion id: ", leccion_id)
    console.log("Datos de tarjeta en el service: ", tarjeta_datos)
    
    try {
        const usuario = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado.")
        
        const leccion = usuario.lecciones.id(leccion_id)
        if(!leccion) throw new Error("Lección no encontrada.")

        const nuevaTarjeta = {
            pregunta: pregunta,
            respuesta: respuesta,
            nivel: 1,
            ultima_revision: new Date(),
            proxima_revision: new Date(Date.now())
        }

        leccion.cajas[0].tarjetas.push(nuevaTarjeta)

        await usuario.save()
        const tarjetas = leccion.cajas[0].tarjetas
        return tarjetas[tarjetas.length - 1]

    } catch (error) {
        throw new Error("Error al guardar la tarjeta", error)
        
    }

}