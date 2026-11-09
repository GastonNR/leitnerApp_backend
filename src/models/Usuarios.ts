import mongoose from 'mongoose'
import type { IUsuarios } from '../types/models.types.js'
import { AsignaturaSchema } from './Asignatura.js'

// Documentos anteriores pueden traer un campo "lecciones" (estructura vieja).
// No está en el esquema: Mongoose no lo lee ni lo borra al guardar.
const usuarioSchema = new mongoose.Schema<IUsuarios>({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    asignaturas: {
        type: [AsignaturaSchema],
        default: []
    }
})

export default mongoose.model<IUsuarios>('Usuario', usuarioSchema)
