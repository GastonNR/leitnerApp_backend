import { NextFunction, Request, Response } from 'express'

// Ruta inexistente: JSON en lugar de la página HTML de Express.
export function rutaNoEncontrada(req: Request, res: Response): void {
    res.status(404).json({ ok: false, message: 'Ruta no encontrada' })
}

// Errores que no atrapó ningún controlador (sobre todo los de express.json:
// JSON mal formado o cuerpo demasiado grande). Nunca devuelve el stack trace.
export function manejarErrores(error: unknown, req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) return next(error)

    const tipo = (error as { type?: string })?.type
    if (tipo === 'entity.parse.failed') {
        res.status(400).json({ ok: false, message: 'El cuerpo de la petición no es un JSON válido.' })
        return
    }
    if (tipo === 'entity.too.large') {
        res.status(413).json({ ok: false, message: 'La petición es demasiado grande.' })
        return
    }

    const status = (error as { status?: number })?.status
    if (typeof status === 'number' && status >= 400 && status < 500) {
        res.status(status).json({ ok: false, message: 'Petición inválida.' })
        return
    }

    console.error(error)
    res.status(500).json({ ok: false, message: 'Error interno del servidor.' })
}
