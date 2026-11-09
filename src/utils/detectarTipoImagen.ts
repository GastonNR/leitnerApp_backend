// Detecta el formato real de una imagen por sus primeros bytes ("magic numbers").
// No se confía en la extensión ni en el Content-Type que manda el cliente.
// SVG queda fuera a propósito: es XML y puede contener scripts.
export type TipoImagen = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export function detectarTipoImagen(datos: Buffer): TipoImagen | null {
    if (datos.length < 12) return null

    if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) return 'image/jpeg'

    if (datos.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'

    const cabecera = datos.subarray(0, 6).toString('ascii')
    if (cabecera === 'GIF87a' || cabecera === 'GIF89a') return 'image/gif'

    if (datos.subarray(0, 4).toString('ascii') === 'RIFF' && datos.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'

    return null
}
