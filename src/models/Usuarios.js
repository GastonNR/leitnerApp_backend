import mongoose from 'mongoose'
import LeccionSchema from './Leccion.js'

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    lecciones: {
        type: [LeccionSchema],
        default: []
    }
})

export default mongoose.model('Usuario', usuarioSchema)