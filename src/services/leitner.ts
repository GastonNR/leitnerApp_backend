import { Types } from "mongoose"
import { ICaja, ITarjeta, ITema } from "../types/models.types.js"

// ==========================================
// DOMINIO: reglas del sistema Leitner (sin base de datos)
// ==========================================

const NIVEL_MIN = 1
const NIVEL_MAX = 5

// Días hasta la próxima revisión según el nivel al que pasa la tarjeta.
export const DIAS_POR_NIVEL: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30,
}

export function crearCajasVacias(): ICaja[] {
    return [
        { nombre: "Caja 1", tarjetas: [] },
        { nombre: "Caja 2", tarjetas: [] },
        { nombre: "Caja 3", tarjetas: [] },
        { nombre: "Caja 4", tarjetas: [] },
        { nombre: "Caja 5", tarjetas: [] },
    ] as ICaja[]
}

function sumarDias(fecha: Date, dias: number): Date {
    const resultado = new Date(fecha)
    resultado.setDate(resultado.getDate() + dias)
    return resultado
}

// Normaliza un nivel desconocido o fuera de rango para que ninguna tarjeta se pierda.
function nivelValido(nivel: unknown): number {
    const n = Number(nivel)
    if (!Number.isInteger(n)) return NIVEL_MIN
    return Math.min(Math.max(n, NIVEL_MIN), NIVEL_MAX)
}

export function crearNuevaTarjeta(pregunta: string, respuesta: string, imagen: Types.ObjectId | null = null): ITarjeta {

    const fechaActual: Date = new Date()

    return {
        pregunta: pregunta,
        respuesta: respuesta,
        nivel: NIVEL_MIN,
        ultima_revision: fechaActual,
        proxima_revision: sumarDias(fechaActual, DIAS_POR_NIVEL[NIVEL_MIN]),
        es_correcta: null,
        imagen
    }
}

// Ids de las imágenes de todas las tarjetas de un tema.
export function imagenesDeTema(tema: Pick<ITema, 'cajas'>): string[] {
    return tema.cajas.flatMap(c => c.tarjetas ?? []).map(t => t.imagen?.toString()).filter((id): id is string => !!id)
}

export function ordenarTarjetasEnCajas(datosTarjetas: Pick<ITema, 'cajas'>): ICaja[] {

    const nuevasCajas: ICaja[] = crearCajasVacias()
    const fechaActual: Date = new Date()

    datosTarjetas.cajas.forEach((caja, indiceCaja) => {

        for (const tarjetaEvaluada of caja.tarjetas ?? []) {

            // Sin evaluar en esta sesión: se queda en su caja actual sin cambios.
            if (tarjetaEvaluada.es_correcta !== true && tarjetaEvaluada.es_correcta !== false) {
                tarjetaEvaluada.es_correcta = null
                nuevasCajas[indiceCaja].tarjetas.push(tarjetaEvaluada)
                continue
            }

            const nuevoNivel = tarjetaEvaluada.es_correcta
                ? Math.min(nivelValido(tarjetaEvaluada.nivel) + 1, NIVEL_MAX)
                : NIVEL_MIN

            tarjetaEvaluada.nivel = nuevoNivel
            tarjetaEvaluada.ultima_revision = fechaActual
            tarjetaEvaluada.proxima_revision = sumarDias(fechaActual, DIAS_POR_NIVEL[nuevoNivel])
            tarjetaEvaluada.es_correcta = null

            nuevasCajas[nuevoNivel - 1].tarjetas.push(tarjetaEvaluada)
        }
    })

    return nuevasCajas

}
