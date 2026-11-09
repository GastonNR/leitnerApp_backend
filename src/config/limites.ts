// Límites de tamaño y cantidad. Todo lo de un usuario vive en un único documento
// de MongoDB (máximo 16 MB): estos topes lo mantienen lejos de ese límite y evitan
// que una sola cuenta llene la base de datos.

export const NOMBRE_USUARIO_MAX = 50
export const EMAIL_MAX = 254
export const PASSWORD_MIN = 8
// bcrypt solo usa los primeros 72 bytes de la contraseña.
export const PASSWORD_MAX_BYTES = 72

export const NOMBRE_MAX = 80                // asignaturas y temas
export const ASIGNATURAS_MAX = 100          // por usuario
export const TEMAS_POR_ASIGNATURA_MAX = 100

export const TEXTO_TARJETA_MAX = 2000       // pregunta y respuesta, cada una
export const TARJETAS_POR_USUARIO_MAX = 3000

export const IMAGENES_BYTES_POR_USUARIO_MAX = 200 * 1024 * 1024
