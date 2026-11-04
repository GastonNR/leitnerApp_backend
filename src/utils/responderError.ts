import { Response } from 'express'
import { AppError } from '../types/AppError.js'

// Traduce un error a una respuesta JSON: usa el status de AppError o 500 por defecto.
export function responderError(res: Response, error: unknown, mensajePorDefecto: string): Response {
    if (error instanceof AppError) {
        return res.status(error.status).json({ ok: false, message: error.message })
    }

    console.error(error)
    return res.status(500).json({ ok: false, message: mensajePorDefecto })
}
