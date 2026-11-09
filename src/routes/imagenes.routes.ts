import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import subirImagen from '../middleware/subirImagen.js'
import {
    obtenerImagen,
    reemplazarImagenTarjeta,
    eliminarImagenTarjeta
} from '../controllers/imagenes.controller.js'

const imagenes_routes = Router()

// Leer: bytes de una imagen (solo su dueño)
imagenes_routes.get('/:id', verificarToken, obtenerImagen)

// Imagen de una tarjeta existente. Crear una tarjeta con imagen se hace en
// POST /api/temas/:temaId/tarjetas.
imagenes_routes.put('/tarjeta/:tarjetaId', verificarToken, subirImagen, reemplazarImagenTarjeta)
imagenes_routes.delete('/tarjeta/:tarjetaId', verificarToken, eliminarImagenTarjeta)

export default imagenes_routes
