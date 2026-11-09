import rateLimit from 'express-rate-limit'
import env from '../config/env.js'

const mensaje = (texto: string) => ({ ok: false, message: texto })

// Login: cuenta solo los intentos fallidos, para frenar la fuerza bruta sin
// molestar a quien entra bien.
export const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.limiteLogin,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: mensaje('Demasiados intentos fallidos. Espera unos minutos y vuelve a probar.'),
})

// Registro: pocas cuentas por IP y por hora, para evitar altas masivas.
export const limitarRegistro = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: env.limiteRegistro,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: mensaje('Se crearon demasiadas cuentas desde esta conexión. Vuelve a intentarlo más tarde.'),
})
