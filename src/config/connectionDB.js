import mongoose from 'mongoose'
import env from './env.js'

export default async function connectDB() {
    
    try{
        mongoose.connect(env.mongoUri)
        console.log('Base de datos conectada.')

    } catch (error){
        console.error(`Error al conectar a la base de datos: ${error.message}`)
        throw error
        
    }
}