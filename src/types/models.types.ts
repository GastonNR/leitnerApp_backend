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
}

export interface ICaja{
    _id?: Types.ObjectId
    nombre: string
    tarjetas: ITarjeta[]
}
export interface ILeccion{
    _id?: Types.ObjectId
    fechaCreacion: Date
    nombre: string
    cajas: ICaja[]
}

export interface IUsuarios{
    _id?: Types.ObjectId
    nombre: string
    email: string
    password: string
    lecciones: ILeccion[]
}

// SUBDOCUMENTOS MONGOOSE
export type LeccionSubdocument = Types.Subdocument<Types.ObjectId> & {
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
export type UsuarioDocument = HydratedDocument<Omit<IUsuarios, 'lecciones'>> & {
    lecciones: Types.DocumentArray<LeccionSubdocument>
}
export type LeccionDocument = HydratedDocument<Omit<ILeccion, 'cajas'>> & {
    cajas: Types.DocumentArray<CajasSubdocument>
}
