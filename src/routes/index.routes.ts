import { Router } from "express"
import user_routes from './usuario.routes.js'
import asignaturas_routes from './asignaturas.routes.js'
import temas_routes from './temas.routes.js'
import tarjetas_routes from './tarjetas.routes.js'
import imagenes_routes from './imagenes.routes.js'

const routes = Router()

routes.use('/usuarios', user_routes)
routes.use('/asignaturas', asignaturas_routes)
routes.use('/temas', temas_routes)
routes.use('/tarjetas', tarjetas_routes)
routes.use('/imagenes', imagenes_routes)

export default routes
