import mongoose from 'mongoose'
import type { IUsuarios } from '../types/models.types.js'
import { LeccionSchema } from './Leccion.js'

const usuarioSchema = new mongoose.Schema<IUsuarios>({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    lecciones: {
        type: [LeccionSchema],
        default: []
    }
})

export default mongoose.model<IUsuarios>('Usuario', usuarioSchema)
