import { Types } from "mongoose"
import { AppError } from "../types/AppError.js"
import { IAsignatura, ICaja, ITema } from "../types/models.types.js"
import { buscarAsignatura, buscarTema, buscarUsuario, mismoNombre } from "./buscar.js"
import { eliminarImagenesService } from "./imagenes.service.js"
import { crearCajasVacias, imagenesDeTema, ordenarTarjetasEnCajas } from "./leitner.js"

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

// Borra la asignatura con todos sus temas, tarjetas e imágenes.
export const deleteAsignaturaService = async (usuarioId: string, asignaturaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const asignatura = buscarAsignatura(usuario, asignaturaId)

    const imagenes = asignatura.temas.flatMap(imagenesDeTema)

    asignatura.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
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

export const deleteTemaService = async (usuarioId: string, temaId: string): Promise<void> => {

    const usuario = await buscarUsuario(usuarioId)
    const { tema } = buscarTema(usuario, temaId)

    const imagenes = imagenesDeTema(tema)

    tema.deleteOne()
    await usuario.save()
    await eliminarImagenesService(usuarioId, imagenes)
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

    tema.set({ cajas: ordenarTarjetasEnCajas({ cajas: cajasNuevas }) })
    await usuario.save()

    // Imágenes de tarjetas que ya no están en el tema guardado.
    const siguen = new Set(imagenesDeTema(tema))
    const huerfanas = [...imagenAnterior.values()].map(id => id?.toString()).filter(id => id && !siguen.has(id))
    await eliminarImagenesService(usuarioId, huerfanas)

    return tema.toObject()
}
