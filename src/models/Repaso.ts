import mongoose from 'mongoose'
import { IRepaso } from '../types/models.types.js'

// Historial de sesiones de estudio, para las métricas. Una fila por sesión
// guardada: qué tema, cuándo y cuántas respuestas acertadas y falladas.
// Vive fuera del Usuario porque crece con el uso (como las imágenes).
// Guarda el tema y no la asignatura: un tema puede moverse de asignatura.
const RepasoSchema = new mongoose.Schema<IRepaso>({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tema: { type: mongoose.Schema.Types.ObjectId, required: true },
    fecha: { type: Date, default: Date.now },
    aciertos: { type: Number, required: true, min: 0 },
    fallos: { type: Number, required: true, min: 0 },
})

RepasoSchema.index({ usuario: 1, fecha: 1 })

export default mongoose.model<IRepaso>('Repaso', RepasoSchema, 'repasos')
