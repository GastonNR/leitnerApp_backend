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

module.exports = { crearTarjeta, cargarTarjetas }