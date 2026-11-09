import mongoose from 'mongoose'
import { TemaSchema } from './Tema.js'
import { IAsignatura } from '../types/models.types.js'

// Una asignatura (Inglés, Biología…) agrupa temas; las cajas están en cada tema.
const AsignaturaSchema = new mongoose.Schema<IAsignatura>({
    nombre: { type: String, required: true },
    fechaCreacion: { type: Date, required: true },
    temas: {
        type: [TemaSchema],
        default: []
    }
})

export { AsignaturaSchema }
