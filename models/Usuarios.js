const mongoose = require('mongoose')

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true }
})

module.exports = mongoose.model('Usuario', usuarioSchema)