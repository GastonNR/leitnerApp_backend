import { Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import {
    cargarLecciones, // => Se realiza al comienzo cuando el usuario se logea. Se carga el usuariojunto con sus lecciones
    //cargarCajasDeLeccion,
    crearLeccion, // => Se realiza cuándo el usario clickea el botón de "Crear lección" en la ventana modal del frontend.
    actualizarCajasDeLeccion, // => Se usa con el botón "Guardar" del header.
    eliminarLeccion, // => Se usa con el botón de eliminar en la ventana modal del frontend.
    //crearTarjeta, // => Se usa con el botón de "Crear tarjeta" en el aside.
} from '../controllers/tarjeta.controller.js'

const lection_routes = Router()


// Lecciones
lection_routes.get('/', verificarToken, cargarLecciones)
lection_routes.post('/leccion', verificarToken, crearLeccion)
//lection_routes.get('/leccion/:leccionId', verificarToken, cargarCajasDeLeccion)
lection_routes.put('/leccion/:leccionId', verificarToken, actualizarCajasDeLeccion)
lection_routes.delete('/leccion/:leccionId', verificarToken, eliminarLeccion)

// Tarjetas
//lection_routes.post('/leccion/:leccionId/tarjeta', verificarToken, crearTarjeta)

export default lection_routes
