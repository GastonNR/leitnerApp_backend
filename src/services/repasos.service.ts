import { Types } from "mongoose"
import Repaso from "../models/Repaso.js"

export const DIAS_HISTORIAL_MAX = 365

export interface RepasoDTO {
    tema: string
    fecha: Date
    aciertos: number
    fallos: number
}

// Registra una sesión. Si falla no se propaga el error: la sesión ya se guardó
// y perder una fila de historial es mejor que mostrarle un error al usuario.
export async function registrarRepaso(usuarioId: string, temaId: Types.ObjectId, aciertos: number, fallos: number): Promise<void> {
    if (aciertos + fallos === 0) return
    try {
        await Repaso.create({ usuario: usuarioId, tema: temaId, aciertos, fallos })
    } catch (error) {
        console.error("No se pudo registrar el repaso", error)
    }
}

// Sesiones de los últimos `dias` días, de la más vieja a la más nueva.
export const getRepasosService = async (usuarioId: string, dias: number): Promise<RepasoDTO[]> => {
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)

    const repasos = await Repaso.find({ usuario: usuarioId, fecha: { $gte: desde } })
        .sort({ fecha: 1 })
        .select({ _id: 0, tema: 1, fecha: 1, aciertos: 1, fallos: 1 })
        .lean()

    return repasos.map(r => ({ tema: r.tema.toString(), fecha: r.fecha, aciertos: r.aciertos, fallos: r.fallos }))
}

// Al borrar temas, su historial se va con ellos.
export const eliminarRepasosDeTemas = async (usuarioId: string, temaIds: Types.ObjectId[]): Promise<void> => {
    if (temaIds.length === 0) return
    await Repaso.deleteMany({ usuario: usuarioId, tema: { $in: temaIds } })
}
