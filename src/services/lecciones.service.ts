import { eliminarLeccion } from "../controllers/lecciones.controller.js"
//import Leccion from "../models/Leccion.js"
import Usuario from "../models/Usuarios.js"
import { AppError } from "../types/AppError.js"
import { TarjetaDTO } from "../types/lecciones.types.js"
import { ICaja, ILeccion, ITarjeta, LeccionDocument, LeccionSubdocument, UsuarioDocument } from "../types/models.types.js"

// ==========================
// DOMAIN reglas del sistema
// ==========================

function crearCajasVacias(): ICaja[] {
    return [
        { nombre: "Caja 1", tarjetas: [] },
        { nombre: "Caja 2", tarjetas: [] },
        { nombre: "Caja 3", tarjetas: [] },
        { nombre: "Caja 4", tarjetas: [] },
        { nombre: "Caja 5", tarjetas: [] },
    ] as ICaja[]
}

function crearNuevaTarjeta(pregunta: string, respuesta: string): ITarjeta {

    const fechaActual: Date = new Date()
    const proxima_revision: Date = new Date(fechaActual)
    proxima_revision.setDate(proxima_revision.getDate() + 1)

    const nuevaTarjeta: ITarjeta = {
        pregunta: pregunta,
        respuesta: respuesta,
        nivel: 1,
        ultima_revision: new Date(),
        proxima_revision: proxima_revision,
        es_correcta: null
    }

    return nuevaTarjeta

}

function ordenarTarjetasEnCajas(datosTarjetas: ILeccion): ICaja[] {
    //console.log("Datos tarjetas en ordenar tarjetas: ", datosTarjetas)
    //console.log("tarjetas dentro de la lección: ", datosTarjetas.cajas[0].tarjetas)
    const nuevasCajas: ICaja[] = crearCajasVacias()
    const fechaActual: Date = new Date()

    for (let i = 0; i < datosTarjetas.cajas.length; i++) {

        for (let j = 0; j < datosTarjetas.cajas[i].tarjetas.length; j++) {

            const tarjetaEvaluada: ITarjeta = datosTarjetas.cajas[i].tarjetas[j]

            if (tarjetaEvaluada.es_correcta === null){
                nuevasCajas[i].tarjetas.push(tarjetaEvaluada)
                continue
            } 

            if (tarjetaEvaluada.es_correcta === true) {

                const proximaRevision: Date = new Date(tarjetaEvaluada.proxima_revision)
                tarjetaEvaluada.proxima_revision = proximaRevision
                tarjetaEvaluada.ultima_revision = new Date()

                switch (tarjetaEvaluada.nivel) {
                    case 1:
                        tarjetaEvaluada.nivel = 2
                        tarjetaEvaluada.proxima_revision.setDate(tarjetaEvaluada.ultima_revision.getDate() + 3)
                        tarjetaEvaluada.es_correcta = null
                        nuevasCajas[1].tarjetas.push(tarjetaEvaluada)

                        break;
                    case 2:
                        tarjetaEvaluada.nivel = 3
                        tarjetaEvaluada.proxima_revision.setDate(tarjetaEvaluada.ultima_revision.getDate() + 7)
                        tarjetaEvaluada.es_correcta = null
                        nuevasCajas[2].tarjetas.push(tarjetaEvaluada)

                        break;
                    case 3:
                        tarjetaEvaluada.nivel = 4
                        tarjetaEvaluada.proxima_revision.setDate(tarjetaEvaluada.ultima_revision.getDate() + 14)
                        tarjetaEvaluada.es_correcta = null
                        nuevasCajas[3].tarjetas.push(tarjetaEvaluada)

                        break;
                    case 4:
                        tarjetaEvaluada.nivel = 5
                        tarjetaEvaluada.proxima_revision.setDate(tarjetaEvaluada.ultima_revision.getDate() + 30)
                        tarjetaEvaluada.es_correcta = null
                        nuevasCajas[4].tarjetas.push(tarjetaEvaluada)

                        break;
                    case 5:
                        tarjetaEvaluada.nivel = 5
                        tarjetaEvaluada.proxima_revision.setDate(tarjetaEvaluada.ultima_revision.getDate() + 30)
                        tarjetaEvaluada.es_correcta = null
                        nuevasCajas[4].tarjetas.push(tarjetaEvaluada)

                        break;
                    default:
                        break;
                }
            } else {

                tarjetaEvaluada.ultima_revision = new Date()
                const proximaRevision: Date = new Date(tarjetaEvaluada.ultima_revision)

                proximaRevision.setDate(proximaRevision.getDate() + 1)
                tarjetaEvaluada.proxima_revision = proximaRevision
            
                tarjetaEvaluada.nivel = 1
                tarjetaEvaluada.es_correcta = null
                nuevasCajas[0].tarjetas.push(tarjetaEvaluada)

            }
        }
    }

    return nuevasCajas

}

// =======================================
// SERVICES controladores de persistencia
// =======================================

// SERVICIO DE LECCIONES

export const createLectionService = async (nombreLeccion: string, usuario_id: string): Promise<ILeccion> => {

    const usuario: UsuarioDocument | null = await Usuario.findById(usuario_id)
    if (!usuario) throw new AppError("Usuario no encontrado", 404)

    const nombreDuplicado = usuario.lecciones.some(
        l => l.nombre.toLowerCase() === nombreLeccion.trim().toLowerCase()
    )

    if (nombreDuplicado) {
        throw new AppError("Ya existe una lección con ese nombre", 409)
    }

    usuario.lecciones.push({
        nombre: nombreLeccion.trim(),
        cajas: crearCajasVacias()
    })
    
    await usuario.save()

    const leccionGuardada = usuario.lecciones[usuario.lecciones.length - 1]
    if(!leccionGuardada) throw new Error("Error al recuperar la lección.")

    return leccionGuardada.toObject()

}

export const getUserLectionsService = async (usuario_id: string): Promise<ILeccion[]> => {
    try {
        const usuario: UsuarioDocument | null = await Usuario.findById(usuario_id)
        if (!usuario) throw new Error("Usuario no encontrado")

        return usuario.lecciones

    } catch (error) {
        throw new Error(`Error al cargar las lecciones del usuario: ${error}`)
    }
}

export const deleteLeccionService = async (usuario_id: string, leccion_id: string): Promise<void> => {

    const usuario: UsuarioDocument | null = await Usuario.findById(usuario_id)
    if (!usuario) throw new Error("Usuario no encontrado")

    const leccion = usuario.lecciones.id(leccion_id)

    if (!leccion) throw new AppError("Lección no encontrada.", 404)
    leccion.deleteOne()
    await usuario.save()
}

// SERVICIOS DE TARJETAS

export const createCardService = async (usuarioId: string, leccionId: string, tarjetaDatos: TarjetaDTO): Promise<ITarjeta> => {

    const { pregunta, respuesta } = tarjetaDatos

    const usuario: UsuarioDocument | null = await Usuario.findById(usuarioId)
    if (!usuario) throw new Error("Usuario no encontrado.")

    const leccion = usuario.lecciones.id(leccionId)
    if (!leccion) throw new Error("Lección no encontrada.")

    const nuevaTarjeta = crearNuevaTarjeta(pregunta, respuesta)
    leccion.cajas[0].tarjetas.push(nuevaTarjeta)

    await usuario.save()
    const tarjetas = leccion.cajas[0].tarjetas
    return tarjetas[tarjetas.length - 1]

}

export const updateBoxesService = async (usuarioId: string, leccionId: string, datosTarjetas: ILeccion) => {

    console.log("Datos tarjetas: ", datosTarjetas)

    const cajasNuevas = datosTarjetas.cajas

    if (!Array.isArray(cajasNuevas) || cajasNuevas.length !== 5) throw new Error("Se esperan exactamente 5 cajas")

    const usuario: UsuarioDocument | null = await Usuario.findById(usuarioId)
    if (!usuario) throw new Error("Usuario no encontrado")

    const leccion: LeccionSubdocument | null = usuario.lecciones.id(leccionId)
    if (!leccion) throw new Error("Lección no encontrada")

    const cajasOrdenadas = ordenarTarjetasEnCajas(datosTarjetas)
    leccion.set({cajas: cajasOrdenadas})
    await usuario.save()

    return leccion
    
}

export const deleteCardService = async (usuarioId: string, tarjetaId: string) => {

    const resultado = await Usuario.updateOne(
        { _id: usuarioId },
        { $pull: { "lecciones.$[].cajas.$[].tarjetas": { _id: tarjetaId } } }
    )

    if (resultado.modifiedCount === 0) throw new Error("Tarjeta no encontrada")

    return resultado
    
}
