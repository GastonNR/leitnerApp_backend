import { registrar, logear } from '../services/usuario.service.js'

const registrarUsuario = async (req, res) => {

    try {

        const { nombre, email, password } = req.body
        const usuario = {nombre, email, password}

        const respuesta = await registrar(usuario)
        res.status(201).json(respuesta)

    } catch (error) {

        res.status(500).json({ menssage: "Error en el servidor desde la función de registrar usuario: ", error })
        
    }
   
}

const logearUsuario = async (req, res) => {
    const { email, password } = req.body

    try {
        const credenciales = {email, password}
        const respuesta = await logear(credenciales)
        res.status(201).json(respuesta)

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: `Error en el servidor ${error}`})
    }
}

export { registrarUsuario, logearUsuario }