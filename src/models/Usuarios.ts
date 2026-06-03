import mongoose from 'mongoose'
import type { IUsuarios } from '../types/models.types.js'
import { LeccionSchema } from './Leccion.js'

const usuarioSchema = new mongoose.Schema<IUsuarios>({
    nombre: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    lecciones: {
        type: [LeccionSchema],
        default: []
    }
})

export default mongoose.model<IUsuarios>('Usuario', usuarioSchema)