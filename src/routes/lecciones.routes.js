const express = require('express')
const router = express.Router()
const verificarToken = require('../middleware/verificarToken')
const {
    cargarLecciones, // => Se realiza al comienzo cuando el usuario se logea. Se carga el usuariojunto con sus lecciones
    //cargarCajasDeLeccion,
    crearLeccion, // => Se realiza cuándo el usario clickea el botón de "Crear lección" en la ventana modal del frontend.
    actualizarCajasDeLeccion, // => Se usa con el botón "Guardar" del header.
    eliminarLeccion, // => Se usa con el botón de eliminar en la ventana modal del frontend.
    //crearTarjeta, // => Se usa con el botón de "Crear tarjeta" en el aside.
} = require('../controllers/tarjeta.controller')

// Lecciones
router.get('/', verificarToken, cargarLecciones)
router.post('/leccion', verificarToken, crearLeccion)
//router.get('/leccion/:leccionId', verificarToken, cargarCajasDeLeccion)
router.put('/leccion/:leccionId', verificarToken, actualizarCajasDeLeccion)
router.delete('/leccion/:leccionId', verificarToken, eliminarLeccion)

// Tarjetas
//router.post('/leccion/:leccionId/tarjeta', verificarToken, crearTarjeta)

module.exports = router
