import request from 'supertest'
import leitnerApp from '../../app.js'

export const api = () => request(leitnerApp)

export const USUARIO_DE_PRUEBA = {
    nombre: 'tester',
    email: 'tester@example.com',
    password: 'clave-segura',
}

// Registra un usuario y devuelve el token de su sesión.
export async function registrarYLoguear(usuario = USUARIO_DE_PRUEBA): Promise<string> {
    await api().post('/api/usuarios/registro').send(usuario).expect(201)
    const res = await api()
        .post('/api/usuarios/login')
        .send({ email: usuario.email, password: usuario.password })
        .expect(200)
    return res.body.token
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
