const express = require('express')
const router = express.Router();
const { registrarUsuario } = require('../controllers/usuarioController')

router.post('/registro', registrarUsuario)

module.exports = router