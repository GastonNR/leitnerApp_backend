const mongoose = require('mongoose')
const LeccionSchema = require('./Leccion')

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    lecciones: {
        type: [LeccionSchema],
        default: []
    }
})

module.exports = mongoose.model('Usuario', usuarioSchema)