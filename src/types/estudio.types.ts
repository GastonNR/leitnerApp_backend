import { ICaja } from "./models.types.js"

// PARAMS
export interface AsignaturaParams{
    asignaturaId: string
}

export interface TemaParams{
    temaId: string
}

export interface TarjetaParams{
    tarjetaId: string
}

// BODIES
// Crear una asignatura o un tema
export interface NombreBody{
    nombre: string
}

// Guardar una sesión de estudio de un tema
export interface GuardarSesionBody{
    cajas: Array<ICaja>
}

export interface CrearTarjetaBody{
    pregunta: string
    respuesta: string
}

// En multipart los campos llegan como texto: quitarImagen = "true"
export interface EditarTarjetaBody{
    pregunta: string
    respuesta: string
    quitarImagen?: boolean | string
}

// DTO
export interface TarjetaDTO{
    pregunta: string
    respuesta: string
}
