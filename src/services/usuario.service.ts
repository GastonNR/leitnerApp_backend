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

async function registrar(usuario: RegistrarUsuarioBody): Promise<RegistrarResponse> {

    try {
        const { nombre, email, password } = usuario
        const salt = await bcrypt.genSalt(10)
        const passEncriptada = await bcrypt.hash(password, salt)

        const nuevoUsuario = new Usuario({
            nombre,
            email,
            password: passEncriptada,
        })

        await nuevoUsuario.save()
        return { message: "Usuario registrado" }

    } catch (error) {
         
        if(error instanceof mongo.MongoServerError && error.code === 11000) throw new AppError("El usuario ya existe.", 409)
        throw error
    }


}

async function loginService(credenciales: LogearUsuarioBody): Promise<LoginResponse> {

    const { email, password } = credenciales

    const usuario = await Usuario.findOne({ email })

    if (!usuario) throw new AppError('Usuario no encontrado', 404)

    const esCorrectaPass = await bcrypt.compare(password, usuario.password)
    if(!esCorrectaPass) throw new AppError('Contraseña incorrecta', 401)

    const payload: JwtPayload = {
        id: usuario._id.toString(),
        email: usuario.email
    }

    const token = jwt.sign(
        payload,
        env.jwtSecret,
        { expiresIn: "24h" }
    )
    const loginResponse: LoginResponse = {
        token,
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre
        }
    }

    return loginResponse

}

export { registrar, loginService }