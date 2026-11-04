import express from 'express'
import cors from 'cors'
import routes from './routes/index.routes.js'

const leitnerApp = express()
leitnerApp.use(cors())
leitnerApp.use(express.json())

// Solo se registra método y URL: el body puede contener contraseñas.
leitnerApp.use((req, res, next)=>{
    console.log(`[REQ] ${req.method} ${req.url}`)
    next()
})

leitnerApp.use('/api', routes)
leitnerApp.get('/health', (req, res)=>{
    res.json({ status: 'OK'})
})

export default leitnerApp
