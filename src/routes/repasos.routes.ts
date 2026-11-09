import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import { cargarRepasos } from '../controllers/repasos.controller.js'

const repasos_routes = Router()

// Historial de sesiones de estudio, para la pestaña de métricas
repasos_routes.get('/', verificarToken, cargarRepasos)

export default repasos_routes
