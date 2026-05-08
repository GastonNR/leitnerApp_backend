import mongoose from 'mongoose'
import CajaSchema from './Cajas.js'

function cajasValidas(val) {
    return val.length === 5
}

const LeccionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    //cajas: {
    //    type: [CajaSchema],
    //    minlength: 5,
    //    maxlength: 5,
    //    default: () => {[
    //        { nombre: "Caja 1", tarjetas: []},
    //        { nombre: "Caja 2", tarjetas: []},
    //        { nombre: "Caja 3", tarjetas: []},
    //        { nombre: "Caja 4", tarjetas: []},
    //        { nombre: "Caja 5", tarjetas: []}
    //    ]}
    //}
    cajas: {
        type: [CajaSchema],
        validate: [cajasValidas, '{PATH} debe contener exactamente 5 cajas']
    }
})

export {LeccionSchema}
export default mongoose.model('Leccion', LeccionSchema)
