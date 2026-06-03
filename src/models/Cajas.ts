import mongoose from 'mongoose'
import TarjetaSchema from './Tarjeta.js'
import { ICaja } from '../types/models.types.js'

const CajaSchema = new mongoose.Schema<ICaja>({
    nombre: { type: String, required: true },
    tarjetas: [TarjetaSchema]
})

export default CajaSchema