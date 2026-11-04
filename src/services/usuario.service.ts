import Usuario from '../models/Usuarios.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type {
    RegistrarResponse,
    LoginResponse,
    JwtPayload,
    RegistrarUsuarioBody,
    LogearUsuarioBody
} from '../types/usuarios.types.js'
import { AppError } from '../types/AppError.js'
import { mongo } from 'mongoose'
import env from '../config/env.js'

const esTextoNoVacio = (valor: unknown): valor is string =>
    typeof valor === 'string' && valor.trim().length > 0

async function registrar(usuario: RegistrarUsuarioBody): Promise<RegistrarResponse> {

    const { nombre, email, password } = usuario

    if (!esTextoNoVacio(nombre) || !esTextoNoVacio(email) || !esTextoNoVacio(password)) {
        throw new AppError("Nombre, email y contraseña son obligatorios.", 400)
    }

    try {
        const passEncriptada = await bcrypt.hash(password, 10)

        const nuevoUsuario = new Usuario({
            nombre,
            email,
            password: passEncriptada,
        })

        await nuevoUsuario.save()
        return { message: "Usuario registrado" }

    } catch (error) {
        if (error instanceof mongo.MongoServerError && error.code === 11000) throw new AppError("El usuario ya existe.", 409)
        throw error
    }

}

async function loginService(credenciales: LogearUsuarioBody): Promise<LoginResponse> {

    const { email, password } = credenciales

    if (!esTextoNoVacio(email) || !esTextoNoVacio(password)) {
        throw new AppError('Email y contraseña son obligatorios.', 400)
    }

    // El esquema normaliza el email (trim + lowercase) también en la consulta.
    const usuario = await Usuario.findOne({ email })

    // Mismo mensaje en ambos casos para no revelar qué emails están registrados.
    const esCorrectaPass = usuario ? await bcrypt.compare(password, usuario.password) : false
    if (!usuario || !esCorrectaPass) throw new AppError('Email o contraseña incorrectos', 401)

    const payload: JwtPayload = {
        id: usuario._id.toString(),
        email: usuario.email
    }

    const token = jwt.sign(
        payload,
        env.jwtSecret,
        { expiresIn: "24h" }
    )

    return {
        token,
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre
        }
    }

}

export { registrar, loginService }
