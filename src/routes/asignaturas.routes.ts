import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import { cargarAsignaturas, crearAsignatura, crearTema, eliminarAsignatura, renombrarAsignatura } from '../controllers/asignaturas.controller.js'

const asignaturas_routes = Router()

asignaturas_routes.get('/', verificarToken, cargarAsignaturas)
asignaturas_routes.post('/', verificarToken, crearAsignatura)
asignaturas_routes.patch('/:asignaturaId', verificarToken, renombrarAsignatura)
asignaturas_routes.delete('/:asignaturaId', verificarToken, eliminarAsignatura)

// Temas de una asignatura (cada uno nace con sus 5 cajas vacías)
asignaturas_routes.post('/:asignaturaId/temas', verificarToken, crearTema)

export default asignaturas_routes
