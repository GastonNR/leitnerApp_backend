const Usuario = require('../models/Usuarios')

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body

        const usuarioExistente = await Usuario.findOne({ email })
        if(usuarioExistente) {
            return res.status(400).json({ mensaje: "El usuario ya existe"})
        }

        const nuevoUsuario = new Usuario({ nombre, email, password })
        await nuevoUsuario.save()

        res.status(201).json({ mensaje: "Usuario registrado con éxito" })

    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor: ", error })
        
    }
   
}

module.exports = {
    registrarUsuario
}