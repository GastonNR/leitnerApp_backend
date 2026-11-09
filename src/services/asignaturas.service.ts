import { Types } from "mongoose"
import { AppError } from "../types/AppError.js"
import { IAsignatura, ICaja, ITema } from "../types/models.types.js"
import { buscarAsignatura, buscarTema, buscarUsuario, mismoNombre } from "./buscar.js"
import { eliminarImagenesService } from "./imagenes.service.js"
import { crearCajasVacias, imagenesDeTema, ordenarTarjetasEnCajas } from "./leitner.js"
import { contarRespuestas, eliminarRepasosDeTemas, registrarRepaso } from "./repasos.service.js"

// ==========================================
// ASIGNATURAS
// ==========================================

export const getAsignaturasService = async (usuarioId: string): Promise<IAsignatura[]> => {
    const usuario = await buscarUsuario(usuarioId)
    return usuario.asignaturas
}

export const createAsignaturaService = async (usuarioId: string, nombre: string): Promise<IAsignatura> => {

    const usuario = await buscarUsuario(usuarioId)

    if (usuario.asignaturas.some(a => mismoNombre(a.nombre, nombre))) {
        throw new AppError("Ya existe una asignatura con ese nombre", 409)
    }

    usuario.asignaturas.push({ nombre: nombre.trim(), fechaCreacion: new Date(), temas: [] })
    await usuario.save()

    return usuario.asignaturas[usuario.asignaturas.length - 1].toObject()
}

// Cambia el nombre. Puede quedar igual o cambiar solo mayúsculas; no puede
// coincidir con el de otra asignatura.
export const renameAsignaturaService = async (usuarioId: string, asignaturaId: string, nombre: string): Promise<IAsignatura> => {

    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    if (usuario.asignaturas.some(a => !a._id.equals(asignatura._id) && mismoNombre(a.nombre, nombre))) {
        throw new AppError("Ya existe una asignatura con ese nombre", 409)
    }

    asignatura.nombre = nombre.trim()
    await usuario.save()
    return asignatura.toObject()
}

// Borra la asignatura con todos sus temas, tarjetas e imágenes.
export const deleteAsignaturaService = async (usuarioId: string, asignaturaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    const imagenes = asignatura.temas.flatMap(imagenesDeTema)
    const temas = asignatura.temas.map(t => t._id)

    asignatura.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
    await eliminarRepasosDeTemas(usuarioId, temas)
}

// ==========================================
// TEMAS
// ==========================================

// Crea un tema con sus 5 cajas vacías. El nombre no se repite dentro de la
// misma asignatura (sí puede repetirse en otra).
export const createTemaService = async (usuarioId: string, asignaturaId: string, nombre: string): Promise<ITema> => {

    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    if (asignatura.temas.some(t => mismoNombre(t.nombre, nombre))) {
        throw new AppError("Ya existe un tema con ese nombre en la asignatura", 409)
    }

    asignatura.temas.push({ nombre: nombre.trim(), fechaCreacion: new Date(), cajas: crearCajasVacias() })
    await usuario.save()

    return asignatura.temas[asignatura.temas.length - 1].toObject()
}

// Cambia el nombre del tema; no puede coincidir con otro de la misma asignatura.
// Sus cajas y tarjetas no cambian.
export const renameTemaService = async (usuarioId: string, temaId: string, nombre: string): Promise<ITema> => {

    const usuario = await buscarUsuario(usuarioId)
    const { asignatura, tema } = buscarTema(usuario, temaId)

    if (asignatura.temas.some(t => !t._id.equals(tema._id) && mismoNombre(t.nombre, nombre))) {
        throw new AppError("Ya existe un tema con ese nombre en la asignatura", 409)
    }

    tema.nombre = nombre.trim()
    await usuario.save()
    return tema.toObject()
}

// Pasa el tema a otra asignatura del usuario, con sus cajas, tarjetas y
// progreso (el tema y sus tarjetas conservan sus _id). Va al final de la lista.
export const moveTemaService = async (usuarioId: string, temaId: string, asignaturaDestinoId: string): Promise<ITema> => {

    const usuario = await buscarUsuario(usuarioId)
    const { asignatura: origen, tema } = buscarTema(usuario, temaId)
    const destino = buscarAsignatura(usuario, asignaturaDestinoId)

    if (origen._id.equals(destino._id)) return tema.toObject()

    if (destino.temas.some(t => mismoNombre(t.nombre, tema.nombre))) {
        throw new AppError(`Ya existe un tema llamado «${tema.nombre}» en «${destino.nombre}»`, 409)
    }

    const datos = tema.toObject()
    tema.deleteOne()
    destino.temas.push(datos)
    await usuario.save()

    return destino.temas[destino.temas.length - 1].toObject()
}

export const deleteTemaService = async (usuarioId: string, temaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    const imagenes = imagenesDeTema(tema)

    tema.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
    await eliminarRepasosDeTemas(usuarioId, [tema._id])
}

// Guarda una sesión de estudio del tema: aplica el algoritmo Leitner a sus cajas.
export const guardarSesionService = async (usuarioId: string, temaId: string, cajasNuevas: ICaja[]): Promise<ITema> => {

    if (!Array.isArray(cajasNuevas) || cajasNuevas.length !== 5) throw new AppError("Se esperan exactamente 5 cajas", 400)

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    // La imagen de cada tarjeta la decide el servidor, no el cliente: se toma de la
    // tarjeta guardada con el mismo _id. Así el cliente no puede perderla ni
    // apuntar a imágenes de otro.
    const imagenAnterior = new Map<string, Types.ObjectId | null>()
    for (const caja of tema.cajas) {
        for (const t of caja.tarjetas) imagenAnterior.set(t._id.toString(), t.imagen ?? null)
    }
    for (const caja of cajasNuevas) {
        for (const t of caja?.tarjetas ?? []) {
            t.imagen = (t._id && imagenAnterior.get(String(t._id))) || null
        }
    }

    // Se cuenta antes de ordenar: el algoritmo vuelve es_correcta a null.
    const { aciertos, fallos } = contarRespuestas(cajasNuevas)

    tema.set({ cajas: ordenarTarjetasEnCajas({ cajas: cajasNuevas }) })
    await usuario.save()
    await registrarRepaso(usuarioId, tema._id, aciertos, fallos)

    // Imágenes de tarjetas que ya no están en el tema guardado.
    const siguen = new Set(imagenesDeTema(tema))
    const huerfanas = [...imagenAnterior.values()].map(id => id?.toString()).filter(id => id && !siguen.has(id))
    await eliminarImagenesService(usuarioId, huerfanas)

    return tema.toObject()
}
