import Usuario from '../models/Usuarios.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

async function registrar(usuario) {

    try {
        const { nombre, email, password } = usuario

        const usuarioExistente = await Usuario.findOne({ email })

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

        if (!usuario) {
            const error = new Error("Usuario no encontrado.")
            error.status = 404
            throw error
        }

        const esCorrectaPass = await bcrypt.compare(password, usuario.password)
        if (!esCorrectaPass) {
            const error = new Error("Contraseña incorrecta.")
            error.status = 401
            throw error
        }

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        )

        return {
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre
            }
        }

    } catch (error) {
        throw new Error("Error en el servidor")
        
    }

}

export { registrar, logear }