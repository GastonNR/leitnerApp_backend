import { Request, Response } from "express"
import { DIAS_HISTORIAL_MAX, getRepasosService } from "../services/repasos.service.js"
import { responderError } from "../utils/responderError.js"

// GET /api/repasos?dias=90
// Historial de sesiones de estudio (para las métricas). dias: 1 a 365, por defecto 90.
const cargarRepasos = async (req: Request<{}, {}, {}, { dias?: string }>, res: Response): Promise<Response> => {

    if (!req.usuario) return res.status(401).json({ ok: false, message: "No autorizado" })

    const dias = req.query.dias === undefined ? 90 : Number(req.query.dias)
    if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_HISTORIAL_MAX) {
        return res.status(400).json({ ok: false, message: `dias debe ser un entero entre 1 y ${DIAS_HISTORIAL_MAX}` })
    }

    try {
        return res.json(await getRepasosService(req.usuario.id, dias))
    } catch (error) {
        return responderError(res, error, "Error al cargar el historial de repasos")
    }
}

export { cargarRepasos }
