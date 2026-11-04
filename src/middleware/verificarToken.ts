import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import env from '../config/env.js'
import type { JwtPayload } from 'jsonwebtoken'

const verificarToken = <P = Record<string, string>>(
    req: Request<P>,
    res: Response,
    next: NextFunction
): void => {

    const [esquema, token] = req.headers.authorization?.split(' ') ?? []

    if (esquema !== 'Bearer' || !token) {
        res.status(401).json({ ok: false, message: 'Token no proporcionado' })
        return
    }

    try {
        const payload = jwt.verify(token, env.jwtSecret) as JwtPayload
        req.usuario = payload
        next()

    } catch (error) {
        // 401: el cliente debe volver a autenticarse.
        res.status(401).json({ ok: false, message: 'Token inválido o expirado' })
    }
}

export default verificarToken
