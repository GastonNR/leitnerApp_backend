import mongoose from "mongoose"
import { ITarjeta } from "../types/models.types.js"

const TarjetaSchema = new mongoose.Schema<ITarjeta>({
    
    pregunta: { type: String, required: true },
    respuesta: { type: String, required: true },
    nivel: {type: Number, default: 1 },
    ultima_revision: { type: Date, default: Date.now },
    proxima_revision: { type: Date, required: true },
    es_correcta: {type: Boolean}

})

export default TarjetaSchema