import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import subirImagen from '../middleware/subirImagen.js'
import { eliminarTema, guardarSesion, moverTema, renombrarTema } from '../controllers/asignaturas.controller.js'
import { crearTarjeta } from '../controllers/tarjetas.controller.js'

const temas_routes = Router()

temas_routes.patch('/:temaId', verificarToken, renombrarTema)
// Mover a otra asignatura { asignaturaId }: conserva tarjetas y progreso
temas_routes.patch('/:temaId/asignatura', verificarToken, moverTema)
temas_routes.delete('/:temaId', verificarToken, eliminarTema)
// Guardar una sesión de estudio: aplica el algoritmo Leitner a las 5 cajas
temas_routes.put('/:temaId/cajas', verificarToken, guardarSesion)
// Nueva tarjeta en la caja 1. JSON o multipart (pregunta, respuesta e "imagen" opcional)
temas_routes.post('/:temaId/tarjetas', verificarToken, subirImagen, crearTarjeta)

export default temas_routes
