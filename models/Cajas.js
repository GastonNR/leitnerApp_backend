const mongoose = require('mongoose')
const TarjetaSchema = require('./Tarjeta')

const CajaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tarjetas: [TarjetaSchema]
})

module.exports = CajaSchema