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

// Mover un tema a otra asignatura
export interface MoverTemaBody{
    asignaturaId: string
}

// Guardar una sesión de estudio de un tema: solo las tarjetas respondidas
export interface GuardarSesionBody{
    respuestas: Array<{ _id: string, es_correcta: boolean }>
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
