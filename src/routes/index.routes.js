import { Router } from "express"
import user_routes from './usuario.routes'
import lection_routes from './lecciones.routes'

const routes = Router()

routes.use('/usuarios', user_routes)
routes.use('/lecciones', lection_routes)

export default routes