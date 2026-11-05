# LeitnerApp — Backend

API REST de **LeitnerApp**, una aplicación para estudiar con tarjetas de memoria (flashcards) usando el **sistema Leitner** de repetición espaciada. Gestiona usuarios, lecciones y tarjetas. La interfaz web está en el [frontend](https://github.com/GastonNR/leitnerApp_frontend).

Hecha con Node.js, TypeScript, Express 5 y MongoDB (Mongoose).

## Cómo funciona

Cada lección tiene 5 cajas y las tarjetas nuevas entran en la caja 1. Al terminar una sesión de estudio, cada tarjeta acertada sube una caja y se vuelve a repasar en 3, 7, 14 o 30 días, según la caja a la que llega. Cada tarjeta fallada vuelve a la caja 1 para repasarla al día siguiente. La lógica está en `ordenarTarjetasEnCajas()` (`src/services/lecciones.service.ts`).

## Requisitos

- Node.js 18 o superior
- Una base de datos MongoDB (local o en [MongoDB Atlas](https://www.mongodb.com/atlas))

## Instalación

```bash
git clone git@github.com:GastonNR/leitnerApp_backend.git
cd leitnerApp_backend
npm install
```

Creá un archivo `.env` en la raíz:

```env
MONGO_URI="mongodb://localhost:27017/leitnerApp"
JWT_SECRET="una-clave-larga-y-secreta"
PORT=3000   # opcional, por defecto 3000
```

```bash
npm run dev
```

La API queda en `http://localhost:3000/api`.

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta la build |
| `npm test` | Tests (usan una base MongoDB en memoria) |

## Rutas

Prefijo `/api`. Las rutas de `/lecciones` requieren `Authorization: Bearer <token>`, que se obtiene en el login.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/usuarios/registro` | Registrar usuario |
| POST | `/usuarios/login` | Iniciar sesión |
| GET | `/lecciones` | Listar lecciones del usuario |
| POST | `/lecciones/leccion` | Crear lección |
| PUT | `/lecciones/leccion` | Guardar sesión de estudio |
| DELETE | `/lecciones/:id` | Eliminar lección |
| POST | `/lecciones/leccion/:leccion_id` | Crear tarjeta |
| DELETE | `/lecciones/leccion/:tarjetaId` | Eliminar tarjeta |
