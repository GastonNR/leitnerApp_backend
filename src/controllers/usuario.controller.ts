import { Request, Response } from 'express'
import { registrar, loginService } from '../services/usuario.service.js'
import { LogearUsuarioBody, RegistrarUsuarioBody } from '../types/usuarios.types.js'
import { AppError } from '../types/AppError.js'

const registrarUsuario = async (req: Request<RegistrarUsuarioBody>, res: Response): Promise<Response> => {

    try {

        const { nombre, email, password } = req.body
        const usuario = { nombre, email, password }

        const respuesta = await registrar(usuario)

        return res.status(201).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        console.error(error)

        if(error instanceof AppError){
            return res.status(500).json({
                ok: false,
                message: error.message
            })
        }

        return res.status(500).json({
            ok: false,
            message: "Error interno del servidor."
        })
    }

}

const logearUsuario = async (req: Request<LogearUsuarioBody>, res: Response): Promise<Response> => {
    console.log(req.body)
    const { email, password } = req.body

    try {
        const credenciales = { email, password }
        const respuesta = await loginService(credenciales)
        return res.status(201).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        console.error(error)
        if(error instanceof AppError){
            return res.status(error.status || 500).json({
                ok: false,
                message: error.message
            })
        }
        return res.status(500).json({
            ok: false,
            messaje: "Error interno del servidor."
        })
    }
}

export { registrarUsuario, logearUsuario }