const Usuario = require('../models/Usuarios')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body

        const usuarioExistente = await Usuario.findOne({ email })
        if(usuarioExistente) {
            return res.status(400).json({ mensaje: "El usuario ya existe"})
        }

        const salt = await bcrypt.genSalt(10)
        const passEncriptada = await bcrypt.hash(password, salt)
        const cajas = Array.from({ length: 5 }, (_, i) => ({
            nombre: `Caja ${i + 1}`,
            tarjetas: []
        }))

        const nuevoUsuario = new Usuario({
            nombre, 
            email, 
            password: passEncriptada,
            cajas
        })

        await nuevoUsuario.save()

        res.status(201).json({ mensaje: "Usuario registrado con éxito" })

    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor: ", error })
        
    }
   
}

const logearUsuario = async (req, res) => {
    const { email, password } = req.body

    try {
        const usuario = await Usuario.findOne({ email })
        if(!usuario) return res.status(404).json({ message: "usuario no encontrado"})
        
        const esCorrectaPass = await bcrypt.compare( password, usuario.password )
        if(!esCorrectaPass) return res.status(401).json({ message: "Contraseña incorrecta" })

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: "2h"}
        )

        res.status(200).json({ token, usuario: { id: usuario._id, nombre: usuario.nombre }})

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Error en el servidor" })
    }
}

module.exports = {
    registrarUsuario, logearUsuario
}