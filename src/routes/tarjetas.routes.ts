import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import subirImagen from '../middleware/subirImagen.js'
import { editarTarjeta, eliminarTarjeta } from '../controllers/tarjetas.controller.js'

const tarjetas_routes = Router()

// Editar texto e imagen. JSON o multipart: pregunta, respuesta, "imagen" opcional
// (la reemplaza) o quitarImagen=true (la borra). El progreso no cambia.
tarjetas_routes.patch('/:tarjetaId', verificarToken, subirImagen, editarTarjeta)
tarjetas_routes.delete('/:tarjetaId', verificarToken, eliminarTarjeta)

export default tarjetas_routes
