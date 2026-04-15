const mongoose = require('mongoose')
const CajaSchema = require('./Cajas')

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

module.exports = LeccionSchema
