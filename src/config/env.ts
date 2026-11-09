import 'dotenv/config'

interface Env{
    port: number
    mongoUri: string
    jwtSecret: string
    esProduccion: boolean
    /** Orígenes permitidos por CORS. Vacío = cualquiera (solo fuera de producción). */
    corsOrigenes: string[]
    /** Valor de "trust proxy" de Express: cantidad de proxies delante del servidor. */
    proxiesConfiables: number
    /** Intentos de login fallidos por IP cada 15 minutos. */
    limiteLogin: number
    /** Registros por IP cada hora. */
    limiteRegistro: number
}

const numero = (valor: string | undefined, porDefecto: number): number => {
    const n = Number(valor)
    return Number.isInteger(n) && n >= 0 && valor !== undefined && valor !== '' ? n : porDefecto
}

const env: Env = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    esProduccion: process.env.NODE_ENV === 'production',
    corsOrigenes: (process.env.CORS_ORIGIN ?? '').split(',').map(o => o.trim()).filter(Boolean),
    proxiesConfiables: numero(process.env.TRUST_PROXY, 0),
    limiteLogin: numero(process.env.LIMITE_LOGIN, 10),
    limiteRegistro: numero(process.env.LIMITE_REGISTRO, 5),
}

if(!env.mongoUri) throw new Error('MongoUri no definido.')
if(!env.jwtSecret) throw new Error('jwt_secret no definido.')

// En producción no se arranca con una configuración insegura.
if (env.esProduccion) {
    if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.')
    if (env.corsOrigenes.length === 0) throw new Error('CORS_ORIGIN es obligatorio en producción (ej. https://mi-app.com).')
}

export default env
