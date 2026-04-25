import mongoose from 'mongoose'
import TarjetaSchema from './Tarjeta.js'

const CajaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tarjetas: [TarjetaSchema]
})

export default CajaSchema