const mongoose = require('mongoose')

const TarjetaSchema = new mongoose.Schema({
    pregunta: { type: String, required: true },
    respuesta: { type: String, required: true },
    proxima_revision: { type: Date, required: true },
    nivel: {type: Number, default: 1 },
    ultima_revision: { type: Date, default: Date.now },
    proxima_revision: { type: Date, required: true }

})

module.exports = TarjetaSchema