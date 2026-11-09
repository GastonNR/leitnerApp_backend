import { RequestHandler, Router } from 'express'
import verificarToken from '../middleware/verificarToken.js'
import subirImagen from '../middleware/subirImagen.js'

import {
    cargarLecciones, // => Se realiza al comienzo cuando el usuario se logea. Se carga el usuariojunto con sus lecciones
    crearLeccion, // => Se realiza cuándo el usario clickea el botón de "Crear lección" en la ventana modal del frontend. 
    actualizarCajasDeLeccion, // => Se usa con el botón "Guardar" del header.
    eliminarLeccion, // => Se usa con el botón de eliminar en la ventana modal del frontend.
    crearTarjeta, // => Se usa con el botón de "Crear tarjeta" en el aside.
    eliminarTarjeta,
    editarTarjeta, // => Botón "Editar" de cada tarjeta en la caja.
    //guardarLeccion
} from '../controllers/lecciones.controller.js'

const lection_routes = Router()

// Lecciones
lection_routes.get('/', verificarToken, cargarLecciones)
lection_routes.post('/leccion', verificarToken, crearLeccion)
lection_routes.put('/leccion', verificarToken, actualizarCajasDeLeccion)
lection_routes.delete('/:id', verificarToken, eliminarLeccion)
//lection_routes.put('/:leccionId', verificarToken, guardarLeccion)

// Tarjetas
// Acepta JSON o multipart/form-data (pregunta, respuesta e "imagen" opcional)
lection_routes.post('/leccion/:leccion_id', verificarToken, subirImagen, crearTarjeta)
lection_routes.delete('/leccion/:tarjetaId',  verificarToken, eliminarTarjeta)
// Editar texto e imagen. JSON o multipart: pregunta, respuesta, "imagen" opcional
// (la reemplaza) o quitarImagen=true (la borra). El progreso no cambia.
lection_routes.patch('/leccion/:tarjetaId', verificarToken, subirImagen, editarTarjeta)

export default lection_routes
