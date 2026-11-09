// Se ejecuta antes de cada archivo de test, antes de importar src/config/env.ts
// (que lanza si faltan estas variables). dotenv no sobrescribe valores ya definidos,
// así que los tests nunca usan la base de datos ni el secreto del .env real.
process.env.JWT_SECRET = 'secreto-de-test'
process.env.MONGO_URI = 'mongodb://no-usar-en-tests'
// Todas las peticiones de los tests salen de la misma IP: sin esto, el límite de
// intentos cortaría los registros. limites.test.ts prueba los límites reales.
process.env.LIMITE_LOGIN ??= '100000'
process.env.LIMITE_REGISTRO ??= '100000'
