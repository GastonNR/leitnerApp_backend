import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction, RequestHandler } from 'express'
import env from '../config/env.js'
import type { JwtPayload } from 'jsonwebtoken'

const verificarToken = <P = Record<string, string>>(
    req: Request<P>,
    res: Response,
    next: NextFunction
): void => {

    const authHeader = req.headers.authorization

    if(!authHeader || !authHeader.startsWith('Bearer')) {
        res.status(401).json({ mensaje: 'Token no proporcionado' })
        return
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = jwt.verify(token, env.jwtSecret) as JwtPayload
        req.usuario = payload
        next()

    } catch (error) {
        res.status(403).json({ mensaje: 'Token inválido o expirado' })
    }
}
//const verificarToken = (req: Request, res: Response, next: NextFunction): void => {
//
//    const authHeader = req.headers.authorization
//
//    if(!authHeader || !authHeader.startsWith('Bearer')) {
//        res.status(401).json({ mensaje: 'Token no proporcionado' })
//        return
//    }
//
//    const token = authHeader.split(' ')[1]
//
//    try {
//        const payload = jwt.verify( token, env.jwtSecret ) as JwtPayload
//        req.usuario = payload
//        next()
//
//    } catch (error) {
//        res.status(403).json({ mensaje: 'Token inválido o expirado' })
//
//    }
//
//}

export default verificarToken