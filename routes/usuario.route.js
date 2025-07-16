const express = require('express')
const router = express.Router();
const { registrarUsuario, logearUsuario } = require('../controllers/usuarioController')

router.post('/registro', registrarUsuario)
router.post('/login', logearUsuario)

module.exports = router