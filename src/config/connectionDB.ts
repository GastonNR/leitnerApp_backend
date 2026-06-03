import mongoose from 'mongoose'
import env from './env.js'

export const connectDB = async (): Promise<void> => {
    
    try{
        await mongoose.connect(env.mongoUri)
        console.log('Base de datos conectada.')

    } catch (error){
        console.error(`Error al conectar a la base de datos: ${error}`)
        throw error
        
    }
}