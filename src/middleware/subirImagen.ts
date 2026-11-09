import multer from 'multer'
import { NextFunction, Request, Response } from 'express'
import { TAMANO_MAXIMO_IMAGEN } from '../services/imagenes.service.js'

// Recibe un campo "imagen" opcional en memoria (nunca toca el disco).
// Si la petición no es multipart (JSON normal), multer no hace nada.
const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1, fields: 10 },
}).single('imagen')

// Envuelve multer para responder con el mismo formato {ok, message} que el resto de la API.
export default function subirImagen<P = Record<string, string>>(req: Request<P>, res: Response, next: NextFunction): void {
    subida(req as unknown as Request, res, (error: unknown) => {
        if (!error) return next()

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(413).json({ ok: false, message: 'La imagen supera los 2 MB.' })
                return
            }
            res.status(400).json({ ok: false, message: 'Solo se admite una imagen, en el campo "imagen".' })
            return
        }

        res.status(400).json({ ok: false, message: 'No se pudo leer la imagen enviada.' })
    })
}
