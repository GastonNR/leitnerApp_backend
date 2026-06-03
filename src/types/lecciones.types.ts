import { ILeccion } from "./models.types.js"

// PARAMS
export interface CargarCajasDeLeccionParams{
    leccionId: string
}

export interface ActualizarCajasDeLeccionParams{
    id: string
}

export interface EliminarLeccionParams{
    id: string
}

export interface CrearTarjetaParams{
    leccion_id: string
}

export interface EliminarTarjetaParams{
    tarjetaId: string
}

//BODIES
export interface CrearLeccionBody{
    nuevaLeccion: string
}
export interface ActualizarCajasDeLeccionBody{
    datosTarjetas: ILeccion
}
export interface CrearTarjetaBody{
    pregunta: string
    respuesta: string
}

//DTO
export interface TarjetaDTO{
    pregunta: string
    respuesta: string
}