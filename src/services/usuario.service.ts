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
import { EMAIL_MAX, NOMBRE_USUARIO_MAX, PASSWORD_MAX_BYTES, PASSWORD_MIN } from '../config/limites.js'

const esTextoNoVacio = (valor: unknown): valor is string =>
    typeof valor === 'string' && valor.trim().length > 0

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Hash de una contraseña cualquiera: si el email no existe, el login compara
// contra este hash igual, para tardar lo mismo que con un usuario real.
const HASH_FALSO = bcrypt.hashSync('contraseña-que-nadie-usa', 10)

// Lanza un 400 con el primer problema de los datos de registro.
function validarRegistro(nombre: string, email: string, password: string): void {
    if (nombre.trim().length > NOMBRE_USUARIO_MAX) {
        throw new AppError(`El nombre no puede superar los ${NOMBRE_USUARIO_MAX} caracteres.`, 400)
    }
    if (email.trim().length > EMAIL_MAX || !FORMATO_EMAIL.test(email.trim())) {
        throw new AppError("El email no es válido.", 400)
    }
    if (password.length < PASSWORD_MIN) {
        throw new AppError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`, 400)
    }
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
        throw new AppError("La contraseña es demasiado larga.", 400)
    }
}

async function registrar(usuario: RegistrarUsuarioBody): Promise<RegistrarResponse> {

    const { nombre, email, password } = usuario

    if (!esTextoNoVacio(nombre) || !esTextoNoVacio(email) || !esTextoNoVacio(password)) {
        throw new AppError("Nombre, email y contraseña son obligatorios.", 400)
    }
    validarRegistro(nombre, email, password)

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
    // Se compara siempre (con un hash falso si no existe) para no delatarlo por el tiempo de respuesta.
    const esCorrectaPass = await bcrypt.compare(password, usuario?.password ?? HASH_FALSO)
    if (!usuario || !esCorrectaPass) throw new AppError('Email o contraseña incorrectos', 401)

    const payload: JwtPayload = {
        id: usuario._id.toString(),
        email: usuario.email
    }

    const token = jwt.sign(
        payload,
        env.jwtSecret,
        { expiresIn: "24h", algorithm: "HS256" }
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
