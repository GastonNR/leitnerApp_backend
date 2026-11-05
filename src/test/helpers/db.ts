import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Usuario from '../../models/Usuarios.js'

let mongod: MongoMemoryServer | undefined

// Levanta un MongoDB en memoria para el archivo de test actual.
export async function conectarDBDeTest(): Promise<void> {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
    // Asegura que el índice único de email exista antes de probar duplicados.
    await Usuario.init()
}

export async function limpiarDB(): Promise<void> {
    const colecciones = Object.values(mongoose.connection.collections)
    await Promise.all(colecciones.map(c => c.deleteMany({})))
}

export async function desconectarDBDeTest(): Promise<void> {
    await mongoose.disconnect()
    await mongod?.stop()
}
