const express = require('express')
const router = express.Router();
const { registrarUsuario, logearUsuario } = require('../controllers/usuario.controller')

router.post('/registro', registrarUsuario)
router.post('/login', logearUsuario)

module.exports = router