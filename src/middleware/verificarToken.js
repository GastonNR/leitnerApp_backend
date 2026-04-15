const jwt = require('jsonwebtoken')

const verificarToken = (req, res, next) => {

    const authHeader = req.headers.authorization
    if(!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ mensaje: 'Token no proporcionado' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const verificado = jwt.verify( token, process.env.JWT_SECRET )
        req.usuario = verificado
        next()

    } catch (error) {
        res.status(403).json({ mensaje: 'Token inválido o expirado' })

    }

}

module.exports = verificarToken