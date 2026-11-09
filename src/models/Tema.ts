import mongoose from 'mongoose'
import CajaSchema from './Cajas.js'
import { ICaja, ITema } from '../types/models.types.js'

function cajasValidas(val: ICaja[]) {
    return val.length === 5
}

// Un tema tiene sus propias 5 cajas del sistema Leitner.
const TemaSchema = new mongoose.Schema<ITema>({
    nombre: { type: String, required: true },
    fechaCreacion: { type: Date, required: true },
    cajas: {
        type: [CajaSchema],
        validate: [cajasValidas, '{PATH} debe contener exactamente 5 cajas']
    }
})

export { TemaSchema }
