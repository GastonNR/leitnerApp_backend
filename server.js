import 'dotenv/config'
import leitnerApp from './src/app.js'
import connectDB from './src/config/connectionDB.js'
import env from './src/config/env.js'

async function iniciarServidor() {
    try {
        await connectDB()
        leitnerApp.listen(env.port, ()=>{
            console.log(`Servidor escuchando en el puerto: ${env.port}`)
        })

    } catch (error) {
        console.error(`Error al iniciar el servidor ${error.message}`)
        process.exit(1)

    }
}

iniciarServidor()