const mongoose = require('mongoose')
const CajaSchema = require('./Cajas')

function arrayLimit(val){
    return val.length === 5
}

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    cajas: {
        type: [CajaSchema],
        validate: [arrayLimit, '{PATH} debe contener exactamente 5 cajas']
    }
})


module.exports = mongoose.model('Usuario', usuarioSchema)