import { HydratedDocument, Types } from 'mongoose'

// INTERFACES DE DOMINIO
export interface ITarjeta{
    _id?: Types.ObjectId
    pregunta: string
    respuesta: string
    nivel: number
    ultima_revision: Date
    proxima_revision: Date
    es_correcta: boolean | null
    /* _id de la imagen (colección "imagenes") asociada a la pregunta, si tiene. */
    imagen?: Types.ObjectId | null
}

export interface ICaja{
    _id?: Types.ObjectId
    nombre: string
    tarjetas: ITarjeta[]
}
export interface ITema{
    _id?: Types.ObjectId
    fechaCreacion: Date
    nombre: string
    cajas: ICaja[]
}

export interface IAsignatura{
    _id?: Types.ObjectId
    fechaCreacion: Date
    nombre: string
    temas: ITema[]
}

export interface IUsuarios{
    _id?: Types.ObjectId
    nombre: string
    email: string
    password: string
    asignaturas: IAsignatura[]
}

export interface IImagen{
    _id?: Types.ObjectId
    usuario: Types.ObjectId
    datos: Buffer
    tipo: string
    tamano: number
    fechaCreacion: Date
}

// SUBDOCUMENTOS MONGOOSE
export type AsignaturaSubdocument = Types.Subdocument<Types.ObjectId> & {
    nombre: string
    fechaCreacion: Date
    temas: Types.DocumentArray<TemaSubdocument>
}
export type TemaSubdocument = Types.Subdocument<Types.ObjectId> & {
    nombre: string
    fechaCreacion: Date
    cajas: Types.DocumentArray<CajasSubdocument>
}
export type CajasSubdocument = Types.Subdocument<Types.ObjectId> & {
    nombre: string
    tarjetas: Types.DocumentArray<TarjetaSubdocument>
}
export type TarjetaSubdocument = Types.Subdocument<Types.ObjectId> & ITarjeta

// DOCUMENTOS HIDRATADOS
export type UsuarioDocument = HydratedDocument<Omit<IUsuarios, 'asignaturas'>> & {
    asignaturas: Types.DocumentArray<AsignaturaSubdocument>
}
