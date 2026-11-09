import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ordenarTarjetasEnCajas, crearNuevaTarjeta, DIAS_POR_NIVEL } from '../services/lecciones.service.js'
import type { ICaja, ITarjeta } from '../types/models.types.js'

// "Hoy" fijo para que los tests sean deterministas.
const HOY = new Date(2026, 10, 4, 12, 0, 0) // 4 nov 2026, 12:00 hora local

function diasDespuesDeHoy(dias: number): Date {
    const fecha = new Date(HOY)
    fecha.setDate(fecha.getDate() + dias)
    return fecha
}

function tarjeta(nivel: number, es_correcta: boolean | null | undefined, proxima = new Date(2026, 9, 28, 12)): ITarjeta {
    return {
        pregunta: `pregunta nivel ${nivel}`,
        respuesta: 'respuesta',
        nivel,
        ultima_revision: new Date(2026, 9, 20, 12),
        proxima_revision: proxima,
        es_correcta: es_correcta as boolean | null,
    }
}

// Construye las 5 cajas poniendo cada tarjeta en la caja que corresponde a su nivel.
function cajasCon(...tarjetas: ITarjeta[]): ICaja[] {
    const cajas: ICaja[] = [1, 2, 3, 4, 5].map(n => ({ nombre: `Caja ${n}`, tarjetas: [] }))
    for (const t of tarjetas) {
        const indice = Math.min(Math.max(Math.trunc(t.nivel) || 1, 1), 5) - 1
        cajas[indice].tarjetas.push(t)
    }
    return cajas
}

const cantidadPorCaja = (cajas: ICaja[]) => cajas.map(c => c.tarjetas.length)

describe('ordenarTarjetasEnCajas (algoritmo Leitner)', () => {

    beforeEach(() => {
        jest.useFakeTimers({ now: HOY })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('siempre devuelve exactamente 5 cajas', () => {
        expect(ordenarTarjetasEnCajas({ cajas: cajasCon() })).toHaveLength(5)
    })

    it.each([
        [1, 2, 3],
        [2, 3, 7],
        [3, 4, 14],
        [4, 5, 30],
    ])('una tarjeta acertada de nivel %i pasa al nivel %i y se revisa en %i días', (nivel, nivelEsperado, dias) => {
        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(tarjeta(nivel, true)) })

        const movida = cajas[nivelEsperado - 1].tarjetas[0]
        expect(movida.nivel).toBe(nivelEsperado)
        expect(movida.proxima_revision).toEqual(diasDespuesDeHoy(dias))
        expect(movida.ultima_revision).toEqual(HOY)
        expect(movida.es_correcta).toBeNull()
    })

    it('una tarjeta acertada de nivel 5 se queda en la caja 5 y se revisa en 30 días', () => {
        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(tarjeta(5, true)) })

        expect(cantidadPorCaja(cajas)).toEqual([0, 0, 0, 0, 1])
        expect(cajas[4].tarjetas[0].nivel).toBe(5)
        expect(cajas[4].tarjetas[0].proxima_revision).toEqual(diasDespuesDeHoy(30))
    })

    it.each([1, 2, 3, 4, 5])('una tarjeta fallada de nivel %i vuelve a la caja 1 y se revisa mañana', (nivel) => {
        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(tarjeta(nivel, false)) })

        expect(cantidadPorCaja(cajas)).toEqual([1, 0, 0, 0, 0])
        const movida = cajas[0].tarjetas[0]
        expect(movida.nivel).toBe(1)
        expect(movida.proxima_revision).toEqual(diasDespuesDeHoy(1))
        expect(movida.es_correcta).toBeNull()
    })

    it('calcula la próxima revisión desde hoy aunque la tarjeta estuviera vencida de otro mes', () => {
        // Regresión: antes se tomaba el mes de la revisión anterior y daba el 07/10 (en el pasado).
        const vencida = tarjeta(1, true, new Date(2026, 9, 28, 12)) // 28 oct

        const [, caja2] = ordenarTarjetasEnCajas({ cajas: cajasCon(vencida) })

        expect(caja2.tarjetas[0].proxima_revision).toEqual(new Date(2026, 10, 7, 12)) // 7 nov
    })

    it('calcula la próxima revisión desde hoy aunque se estudie antes de tiempo', () => {
        // Regresión: antes daba el 29/01 en vez del 30/12 al estudiar el 30/11 una tarjeta del 01/12.
        jest.setSystemTime(new Date(2026, 10, 30, 12))
        const adelantada = tarjeta(4, true, new Date(2026, 11, 1, 12))

        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(adelantada) })

        expect(cajas[4].tarjetas[0].proxima_revision).toEqual(new Date(2026, 11, 30, 12))
    })

    it('deja sin cambios en su caja las tarjetas no evaluadas (null)', () => {
        const sinEvaluar = tarjeta(3, null)
        const proximaOriginal = sinEvaluar.proxima_revision

        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(sinEvaluar) })

        expect(cantidadPorCaja(cajas)).toEqual([0, 0, 1, 0, 0])
        expect(cajas[2].tarjetas[0].nivel).toBe(3)
        expect(cajas[2].tarjetas[0].proxima_revision).toBe(proximaOriginal)
    })

    it('trata es_correcta ausente como "no evaluada", no como fallo', () => {
        const cajas = ordenarTarjetasEnCajas({ cajas: cajasCon(tarjeta(4, undefined)) })

        expect(cantidadPorCaja(cajas)).toEqual([0, 0, 0, 1, 0])
        expect(cajas[3].tarjetas[0].nivel).toBe(4)
        expect(cajas[3].tarjetas[0].es_correcta).toBeNull()
    })

    it.each([
        ['mayor que 5', 99, 5],
        ['menor que 1', 0, 2],
        ['no numérico', Number.NaN, 2],
    ])('no pierde una tarjeta acertada con nivel %s', (_desc, nivel, nivelEsperado) => {
        const cajas: ICaja[] = cajasCon()
        cajas[2].tarjetas.push(tarjeta(nivel, true))

        const resultado = ordenarTarjetasEnCajas({ cajas })

        expect(resultado.flatMap(c => c.tarjetas)).toHaveLength(1)
        expect(resultado[nivelEsperado - 1].tarjetas[0].nivel).toBe(nivelEsperado)
    })

    it('reparte una sesión mixta sin perder ni duplicar tarjetas', () => {
        const entrada = cajasCon(
            tarjeta(1, true), tarjeta(1, false), tarjeta(1, null),
            tarjeta(2, true), tarjeta(3, false), tarjeta(4, true), tarjeta(5, true), tarjeta(5, null),
        )

        const cajas = ordenarTarjetasEnCajas({ cajas: entrada })

        expect(cantidadPorCaja(cajas)).toEqual([3, 1, 1, 0, 3])
        expect(cajas.flatMap(c => c.tarjetas).every(t => t.es_correcta === null)).toBe(true)
        // Cada tarjeta queda en la caja de su nivel.
        cajas.forEach((caja, i) => caja.tarjetas.forEach(t => expect(t.nivel).toBe(i + 1)))
    })

    it('tolera cajas sin array de tarjetas', () => {
        const cajas = cajasCon(tarjeta(1, true))
        ;(cajas[3] as Partial<ICaja>).tarjetas = undefined

        expect(cantidadPorCaja(ordenarTarjetasEnCajas({ cajas }))).toEqual([0, 1, 0, 0, 0])
    })
})

describe('crearNuevaTarjeta', () => {

    beforeEach(() => {
        jest.useFakeTimers({ now: HOY })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('crea la tarjeta en nivel 1, sin evaluar y con revisión mañana', () => {
        const nueva = crearNuevaTarjeta('¿Capital de Francia?', 'París')

        expect(nueva).toEqual({
            pregunta: '¿Capital de Francia?',
            respuesta: 'París',
            nivel: 1,
            ultima_revision: HOY,
            proxima_revision: diasDespuesDeHoy(DIAS_POR_NIVEL[1]),
            es_correcta: null,
            imagen: null,
        })
    })
})
