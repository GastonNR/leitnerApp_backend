import Usuario from '../models/Usuarios.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

async function registrar(usuario) {

    try {
        const { nombre, email, password } = usuario
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
            //lecciones: [{ nombre: 'Mi primera leccion', cajas: cajasVacias }]
        })

        const guardar = await nuevoUsuario.save()
        return { message: "Usuario registrado" }

    } catch (error) {

        if(error.code === 11000){
            const newError = new Error("El usuario ya existe")
            newError.status = 409
            throw newError
        }

        throw error
    }


}

async function loginService(credenciales) {

    const { email, password } = credenciales

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

}

export { registrar, loginService }