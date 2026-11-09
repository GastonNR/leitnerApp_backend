import mongoose from 'mongoose'
import { IImagen } from '../types/models.types.js'

// Las imágenes viven en su propia colección y no dentro del Usuario: el documento
// del usuario (con todas sus asignaturas) tiene un límite de 16 MB y se carga entero
// en cada operación. La tarjeta solo guarda el _id de la imagen.
const ImagenSchema = new mongoose.Schema<IImagen>({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    datos: { type: Buffer, required: true },
    tipo: { type: String, required: true },
    tamano: { type: Number, required: true },
    fechaCreacion: { type: Date, default: Date.now },
})

export default mongoose.model<IImagen>('Imagen', ImagenSchema, 'imagenes')
