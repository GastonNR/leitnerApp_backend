import express from 'express'
import cors from 'cors'
import routes from './routes/index.routes'

const leitnerApp = express
leitnerApp.use(cors())
leitnerApp.use(express.json)

leitnerApp.use('/api', routes)
leitnerApp.length('/health', (req, res)=>{
    res.json({ status: 'OK'})
})

export default leitnerApp