import express from 'express'
import cors from 'cors'
import routes from './routes/index.routes.js'

const leitnerApp = express()
leitnerApp.use(cors())
leitnerApp.use(express.json())


leitnerApp.use((req, res, next)=>{
    console.log(`[REQ] ${req.method} ${req.url}`, req.body)
    next()
})

leitnerApp.use('/api', routes)
leitnerApp.use('/health', (req, res)=>{
    res.json({ status: 'OK'})
})

export default leitnerApp