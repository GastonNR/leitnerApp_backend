import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes/index.routes.js'
import env from './config/env.js'
import { manejarErrores, rutaNoEncontrada } from './middleware/manejarErrores.js'

const leitnerApp = express()

// Detrás de un proxy (Render, Railway, Nginx…) hace falta para que el límite de
// intentos vea la IP real del cliente y no la del proxy.
leitnerApp.set('trust proxy', env.proxiesConfiables)

// Cabeceras de seguridad; también quita "X-Powered-By: Express".
leitnerApp.use(helmet())

// Solo el frontend propio puede llamar a la API desde el navegador.
// Sin CORS_ORIGIN (desarrollo) se permite cualquier origen.
leitnerApp.use(cors(env.corsOrigenes.length > 0 ? { origin: env.corsOrigenes } : undefined))

leitnerApp.use(express.json({ limit: '1mb' }))

// Solo se registra método y URL: el body puede contener contraseñas.
leitnerApp.use((req, res, next)=>{
    console.log(`[REQ] ${req.method} ${req.url}`)
    next()
})

leitnerApp.use('/api', routes)
leitnerApp.get('/health', (req, res)=>{
    res.json({ status: 'OK'})
})

leitnerApp.use(rutaNoEncontrada)
leitnerApp.use(manejarErrores)

export default leitnerApp
