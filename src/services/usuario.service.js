import Usuarios from '../models/Usuarios'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

async function registrar(usuario) {
    try {
        const { nombre, email, password } = usuario

        const usuarioExistente = await Usuarios.findOne({ email })

        if (usuarioExistente) {
            throw new Error("El usuario ya existe")
        }

        const salt = await bcrypt.genSalt(10)
        const passEncriptada = await bcrypt.hash(password, salt)

        const cajasVacias = Array.from({ length: 5 }, (_, i) => ({
            nombre: `Caja ${i + 1}`,
            tarjetas: []
        }))

        const nuevoUsuario = new Usuario({
            nombre,
            email,
            password: passEncriptada,
            lecciones: [{ nombre: 'Mi primera leccion', cajas: cajasVacias }]
        })

        await nuevoUsuario.save()

        return { mensaje: "Usuario registrado con éxito" }

    } catch (error) {
        
        throw new Error(`Error en el servidor ${error}`)
    }
}

async function logear( credenciales ) {

    const { email, password } = credenciales

    try {
        const usuario = await Usuario.findOne({ email })
        if (!usuario) return res.status(404).json({ message: "usuario no encontrado" })

        const esCorrectaPass = await bcrypt.compare(password, usuario.password)
        if (!esCorrectaPass) return res.status(401).json({ message: "Contraseña incorrecta" })

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        )

        res.status(200).json({ token, usuario: { id: usuario._id, nombre: usuario.nombre } })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Error en el servidor" })
    }

}

export { registrar, logear }