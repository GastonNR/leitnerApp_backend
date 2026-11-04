import { Request, Response } from 'express'
import { registrar, loginService } from '../services/usuario.service.js'
import { LogearUsuarioBody, RegistrarUsuarioBody } from '../types/usuarios.types.js'
import { responderError } from '../utils/responderError.js'

const registrarUsuario = async (req: Request<{}, {}, RegistrarUsuarioBody>, res: Response): Promise<Response> => {

    try {
        const { nombre, email, password } = req.body ?? {}
        const respuesta = await registrar({ nombre, email, password })

        return res.status(201).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        return responderError(res, error, "Error interno del servidor.")
    }

}

const logearUsuario = async (req: Request<{}, {}, LogearUsuarioBody>, res: Response): Promise<Response> => {

    try {
        const { email, password } = req.body ?? {}
        const respuesta = await loginService({ email, password })

        return res.status(200).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        return responderError(res, error, "Error interno del servidor.")
    }
}

export { registrarUsuario, logearUsuario }
