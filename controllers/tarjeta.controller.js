const { Router } = require("express")
const Usuario = require("../models/Usuarios")
const CajaSchema = require("../models/Cajas")

const crearTarjeta = async (req, res) => {
    const { 
        pregunta, 
        respuesta,
        nivel, 
        ultima_revision,
        proxima_revision
    } = req.body

    try {

        const usuario = await Usuario.findById(req.usuario.id)
        if(!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado"})

        const nuevaTarjeta = { 
            pregunta, 
            respuesta,
            nivel, 
            ultima_revision,
            proxima_revision
        }
        
        usuario.cajas[0].tarjetas.push(nuevaTarjeta)

        await usuario.save()
        res.status(200).json({ mensaje: "Tarjeta agregada correctamente" })

    } catch (error) {
        console.error(error)
        res.status(500).json({ mensaje: "Error en el servidor" })
    }
}

const cargarTarjetas = async (req, res) => {
    try {
        
        const usuario = await Usuario.findById(req.usuario.id)
        if(!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado"})
        
        const cajas = usuario.cajas
        //console.log(cajas)

        return res.status(200).json(cajas)

    } catch (error) {
        console.error('Error al cargar cajas:', error)
        return res.status(500).json({ mensaje: 'Error al cargar las cajas del usuario' })
    }
}

const actualizarCajas = async (req, res) => {
    console.log(req.body[0].tarjetas)
    const id = req.params.id
    const datos = req.body

    try {
        const cajasActualizadas = await Usuario.findByIdAndUpdate(
            id,
            {
                $set: {
                    cajas: datos
                }
            },
            {
                new: true,
                runValidators:true
            }
        )
        if(!cajasActualizadas) {
            return res.status(404).json({ mensaje: "NO se ha podido actualizar las cajas"})
        }
        //res.json(cajasActualizadas)
    } catch (error) {
        console.error("Error al actualizar los datos: ", error)
        res.status(500).json({ mensaje: "Error interno al actualizar" })
    }


}

module.exports = { crearTarjeta, cargarTarjetas, actualizarCajas }