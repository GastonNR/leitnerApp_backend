import mongoose from 'mongoose'
import CajaSchema from './Cajas.js'

function cajasValidas(val) {
    return val.length === 5
}

const LeccionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    cajas: {
        type: [CajaSchema],
        validate: [cajasValidas, '{PATH} debe contener exactamente 5 cajas']
    }
})

export {LeccionSchema}
export default mongoose.model('Leccion', LeccionSchema)
