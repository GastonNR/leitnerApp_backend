import { Router } from "express"
import user_routes from './usuario.routes.js'
import lection_routes from './lecciones.routes.js'
import imagenes_routes from './imagenes.routes.js'

const routes = Router()

routes.use('/usuarios', user_routes)
routes.use('/lecciones', lection_routes)
routes.use('/imagenes', imagenes_routes)

export default routes