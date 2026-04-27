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

        return usuario.lecciones[usuario.lecciones.length -1 ]

    } catch (error) {
        throw error

    }

}