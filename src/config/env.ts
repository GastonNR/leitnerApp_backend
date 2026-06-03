import 'dotenv/config'

interface Env{
    port: number
    mongoUri: string
    jwtSecret: string
}

const env: Env = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || ''
}

if(!env.mongoUri) throw new Error('MongoUri no definido.')
if(!env.jwtSecret) throw new Error('jwt_secret no definido.')

export default env