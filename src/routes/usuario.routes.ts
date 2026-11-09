import { Router } from 'express'
import { registrarUsuario, logearUsuario } from '../controllers/usuario.controller.js'
import { limitarLogin, limitarRegistro } from '../middleware/limitarIntentos.js'

const router = Router()

router.post('/registro', limitarRegistro, registrarUsuario)
router.post('/login', limitarLogin, logearUsuario)

export default router
