import Usuario from "../models/Usuarios.js"
import { AppError } from "../types/AppError.js"
import { AsignaturaSubdocument, TemaSubdocument, UsuarioDocument } from "../types/models.types.js"

// Todo vive dentro del Usuario: cada operación empieza cargándolo y
// baja hasta la asignatura, el tema o la tarjeta.

export async function buscarUsuario(usuarioId: string): Promise<UsuarioDocument> {
    const usuario: UsuarioDocument | null = await Usuario.findById(usuarioId)
    if (!usuario) throw new AppError("Usuario no encontrado", 404)
    return usuario
}

export function buscarAsignatura(usuario: UsuarioDocument, asignaturaId: string): AsignaturaSubdocument {
    const asignatura = usuario.asignaturas.id(asignaturaId)
    if (!asignatura) throw new AppError("Asignatura no encontrada.", 404)
    return asignatura
}

// Un id de tema alcanza: se busca en todas las asignaturas del usuario.
export function buscarTema(usuario: UsuarioDocument, temaId: string): { asignatura: AsignaturaSubdocument, tema: TemaSubdocument } {
    for (const asignatura of usuario.asignaturas) {
        const tema = asignatura.temas.id(temaId)
        if (tema) return { asignatura, tema }
    }
    throw new AppError("Tema no encontrado.", 404)
}

// Mismo nombre sin importar mayúsculas ni espacios en los bordes.
export function mismoNombre(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
}
