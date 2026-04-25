import { Router } from 'express'
import { registrarUsuario, logearUsuario } from '../controllers/usuario.controller.js'

const router = Router()

router.post('/registro', registrarUsuario)
router.post('/login', logearUsuario)

export default router