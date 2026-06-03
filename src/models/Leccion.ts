import mongoose from 'mongoose'
import CajaSchema from './Cajas.js'
import { ILeccion } from '../types/models.types.js'
import { ICaja } from '../types/models.types.js'

function cajasValidas(val: ICaja[]) {
    return val.length === 5
}

const LeccionSchema = new mongoose.Schema<ILeccion>({
    nombre: { type: String, required: true },
    cajas: {
        type: [CajaSchema],
        validate: [cajasValidas, '{PATH} debe contener exactamente 5 cajas']
    }
})

export {LeccionSchema}
//export default mongoose.model<ILeccion>('Leccion', LeccionSchema)
