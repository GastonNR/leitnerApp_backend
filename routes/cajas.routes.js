const express = require('express')
const router = express.Router()
const verificarToken = require('../middleware/verificarToken')
const { crearTarjeta, cargarTarjetas, actualizarCajas } = require('../controllers/tarjeta.controller')

router.post('/nuevaTarjeta', verificarToken, crearTarjeta)
router.get('/', verificarToken, cargarTarjetas)
router.put('/:id', verificarToken, actualizarCajas)

module.exports = router