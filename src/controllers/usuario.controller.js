import { registrar, loginService } from '../services/usuario.service.js'

const registrarUsuario = async (req, res) => {

    try {

        const { nombre, email, password } = req.body
        const usuario = {nombre, email, password}

        const respuesta = await registrar(usuario)

        res.status(201).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        console.error(error)

        res.status(500).json({
            ok: false,
            message: error.message 
        })
        
    }
   
}

const logearUsuario = async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body

    try {
        const credenciales = {email, password}
        const respuesta = await loginService(credenciales)
        res.status(201).json({
            ok: true,
            ...respuesta
        })

    } catch (error) {
        console.error(error)

        res.status(error.status || 500).json({
            ok: false,
            message: error.message
        })
    }
}

export { registrarUsuario, logearUsuario }