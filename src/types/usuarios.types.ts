// BODIES REQUEST
export interface RegistrarUsuarioBody {
    nombre: string
    email: string
    password: string
}

export interface LogearUsuarioBody {
    email: string
    password: string
}

// RESPONSES
export interface UsuarioLogin {
    id: string
    nombre: string
}

export interface LoginResponse {
    token: string
    usuario: UsuarioLogin
}

export interface RegistrarResponse {
    message: string
}

// AUTENTICACIÓN
export interface JwtPayload {
    id: string
    email: string
}