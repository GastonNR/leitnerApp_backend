const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const usuariosRoutes = require('./routes/usuario.route')

const leitnerApp = express()
const port = process.env.PORT || 3000

leitnerApp.use(cors())
leitnerApp.use(express.json())

leitnerApp.use('/api/usuarios', usuariosRoutes)

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Conectado a la base de datos")
    leitnerApp.listen(port, ()=> console.log(`Servidor corriendo en el puerto ${port}`))
})
.catch(error => console.error("Error al conectar a la base de datos: ", error))