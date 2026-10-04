# Backend — Sistema de Pagos y Habitaciones (SADOJ Tours)

> Sistema en **producción** que maneja pagos, pasajeros (pax) y habitaciones por viaje/resort.
> Es la única fuente de verdad para esos datos. Cualquier integración nueva (ej. el sitio
> público) debe **consumir esta API**, no reemplazarla ni tocar su base de datos directamente.

- Repo: `backend/`
- URL en producción: `https://coral-butterfly-408024.hostingersite.com/api`
- URL del panel que lo consume: `https://pagos.sadojtours.com`

---

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js (ESM, `"type": "module"`) |
| Framework HTTP | Express 4 |
| Base de datos | MySQL (pool vía `mysql2/promise`) |
| Auth | JWT (`jsonwebtoken`) + contraseñas con `bcryptjs` |
| CORS | `cors`, whitelist de orígenes fija en código |
| Config | `dotenv` (`.env`) |
| Dev | `nodemon` |

Scripts (`package.json`):
- `npm start` → `node server.js`
- `npm run dev` → `nodemon server.js`

---

## 2. Estructura de carpetas

```
backend/
├── server.js                # entrypoint: middlewares, CORS, montaje de rutas, manejo global de errores
├── db.js                    # pool de conexión MySQL
├── db-init.js                # crea tablas base (usuarios, logs_actividad) y usuarios semilla
├── middleware/
│   └── auth.js               # requireAuth: valida JWT del header Authorization
├── routes/
│   ├── auth.js                # login / me
│   ├── viajes.js              # CRUD de viajes + compartir
│   ├── viajesPublico.js       # vista pública de un viaje vía token (sin login)
│   ├── habitaciones.js        # CRUD de habitaciones + personas dentro de ellas
│   ├── personas.js            # editar persona, marcar gratis, pagos
│   ├── movimientos.js         # mover una persona entre habitaciones
│   ├── stats.js               # dashboard y reportes agregados
│   └── logs.js                # consulta de logs de actividad
├── utils/
│   └── log.js                 # registrarLog / registrarError (persisten en logs_actividad)
└── migrations/                # scripts SQL incrementales (ver README propio)
```

---

## 3. Modelo de datos (MySQL)

Esquema real extraído en vivo de la base de datos de producción (`SHOW CREATE TABLE`) el 2026-08-19. 8 tablas, motor InnoDB, `utf8mb4_unicode_ci`.

### usuarios
Creada por `db-init.js`. Si `SEED_USERS` está definido (JSON con `username`, `password` y `nombreDisplay`), esos usuarios se insertan al iniciar cuando no existen.
```sql
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_display` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
);
```

### logs_actividad
Creada por `db-init.js`. Bitácora de toda acción relevante y de todo error/HTTP≥400.
```sql
CREATE TABLE `logs_actividad` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) DEFAULT NULL,
  `accion` varchar(30) DEFAULT NULL,
  `entidad` varchar(30) DEFAULT NULL,
  `entidad_id` int(11) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha`)
);
```

### viajes
```sql
CREATE TABLE `viajes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `nota` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `tipo` enum('resort','tour') DEFAULT 'resort',
  `divisa` varchar(10) DEFAULT 'USD',
  `slug` varchar(255) DEFAULT NULL,
  `token_compartir` varchar(100) DEFAULT NULL,
  `compartir_activo` tinyint(1) DEFAULT 1,
  `expira_compartir` datetime DEFAULT NULL,
  `edad_minima_pago` int(11) NOT NULL DEFAULT 0,
  `tipo_compartir` varchar(20) DEFAULT 'completo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `token_compartir` (`token_compartir`)
);
```

### habitaciones
```sql
CREATE TABLE `habitaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(10) NOT NULL,
  `tipo` enum('Doble','Triple') NOT NULL DEFAULT 'Doble',
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_nino` decimal(10,2) DEFAULT 0.00,
  `es_stack` tinyint(1) NOT NULL DEFAULT 0,
  `nota` text DEFAULT NULL,
  `etiqueta` varchar(100) DEFAULT 'General',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `viaje_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_num_por_viaje` (`viaje_id`,`numero`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_es_stack` (`es_stack`),
  CONSTRAINT `fk_habitaciones_viaje` FOREIGN KEY (`viaje_id`) REFERENCES `viajes` (`id`) ON DELETE SET NULL
);
```
> ⚠️ **Bug latente**: el `enum` de `tipo` solo acepta `'Doble'` o `'Triple'` — **no incluye `'Single'`**. Sin embargo el código (`routes/habitaciones.js`, `routes/movimientos.js`, `routes/personas.js`) calcula y asigna `tipo = 'Single'` cuando una habitación queda con 1 sola persona (ej. al mover o eliminar personas, o vía `PATCH /:id/tipo`). Eso hará que MySQL trunque el valor a `''` (modo no estricto) o lance error (modo estricto) en ese `UPDATE`. Vale la pena correr `ALTER TABLE habitaciones MODIFY tipo ENUM('Single','Doble','Triple') NOT NULL DEFAULT 'Doble';` para alinear la base con lo que el código espera.

### personas
```sql
CREATE TABLE `personas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `habitacion_id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `posicion` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `es_nino` tinyint(1) NOT NULL DEFAULT 0,
  `es_gratis` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_persona_habitacion` (`habitacion_id`,`posicion`),
  KEY `idx_habitacion` (`habitacion_id`),
  KEY `idx_nombre` (`nombre`),
  CONSTRAINT `personas_ibfk_1` FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE
);
```

### pagos
```sql
CREATE TABLE `pagos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `persona_id` int(11) NOT NULL,
  `mes` varchar(3) NOT NULL,
  `monto` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_persona` (`persona_id`),
  KEY `idx_mes` (`mes`),
  KEY `idx_persona_mes` (`persona_id`,`mes`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE CASCADE
);
```

### historial_movimientos
```sql
CREATE TABLE `historial_movimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `persona_id` int(11) NOT NULL,
  `habitacion_origen_id` int(11) NOT NULL,
  `habitacion_destino_id` int(11) NOT NULL,
  `fecha_movimiento` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `habitacion_origen_id` (`habitacion_origen_id`),
  KEY `habitacion_destino_id` (`habitacion_destino_id`),
  KEY `idx_persona` (`persona_id`),
  KEY `idx_fecha` (`fecha_movimiento`),
  CONSTRAINT `historial_movimientos_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `historial_movimientos_ibfk_2` FOREIGN KEY (`habitacion_origen_id`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `historial_movimientos_ibfk_3` FOREIGN KEY (`habitacion_destino_id`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE
);
```

### configuracion
Existe en la base de datos pero **no la usa ningún archivo de este backend** (`grep` sin resultados en `routes/`, `utils/`, `middleware/`). Es probablemente un remanente de otra parte del sistema o de una versión anterior — confirmar con quien mantiene el sistema actual antes de asumir que está en desuso.
```sql
CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) NOT NULL,
  `valor` text NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
);
```

### Diagrama de relaciones

```
viajes 1───∞ habitaciones 1───∞ personas 1───∞ pagos
                    │                  │
                    │                  └──∞ historial_movimientos (origen/destino → habitaciones)
                    └── (unique numero+viaje_id)

usuarios         (independiente, solo auth)
logs_actividad   (independiente, auditoría)
configuracion    (independiente, sin uso detectado en este backend)
```

### Migraciones incrementales
En `migrations/` (ver `migrations/README.md` para cómo aplicarlas), ya reflejadas en el esquema de arriba:
- `001_create_viajes.sql` — crea `viajes` y `habitaciones.viaje_id` (FK).
- `002_add_es_nino_to_personas.sql` — agrega `personas.es_nino`.
- `003_add_edad_minima_pago.sql` — agrega `viajes.edad_minima_pago` (0 = todos los niños pagan; N = solo niños de N años en adelante pagan).

Algunas rutas también aplican `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` de forma perezosa/idempotente al vuelo (`es_gratis` en `personas`, `edad_minima_pago` en `viajes`, columnas de `token_compartir`/`compartir_activo`/`expira_compartir`/`tipo_compartir` en `viajes`), como red de seguridad si la migración manual no se corrió.

---

## 4. Autenticación

- Login por `username`/`password` → JWT firmado con `JWT_SECRET`, expira según `JWT_EXPIRES_IN` (default `12h`).
- El JWT solo contiene `{ username }`.
- Rutas protegidas exigen header `Authorization: Bearer <token>` (middleware `requireAuth` en `middleware/auth.js`). Si falta o es inválido → `401 { error: 'No autorizado' }`.
- `req.usuario` queda disponible en toda ruta protegida (se usa para los logs de auditoría).
- **Sin registro público**: los usuarios se siembran directamente en la base de datos (`db-init.js`), no hay endpoint para crear cuentas.

---

## 5. CORS

Definido en `server.js`. Whitelist fija (no viene de variable de entorno):

```js
const allowedOrigins = ['https://pagos.sadojtours.com', 'https://www.pagos.sadojtours.com'];
```

- Métodos permitidos: `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
- `credentials: true`, preflight (`OPTIONS`) manejado globalmente.
- Peticiones sin `origin` (ej. Postman, server-to-server) se permiten.

> ⚠️ Si el nuevo sitio público (u otro backend) necesita llamar a esta API desde un dominio distinto, hay que agregar ese origen a `allowedOrigins` — actualmente **solo** los dos dominios de `pagos.sadojtours.com` pueden hacer fetch desde navegador.

---

## 6. Variables de entorno

Definidas en `.env` (ver `.env.example`):

| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL |
| `PORT` | Puerto del servidor Express (default `4000`) |
| `JWT_SECRET` | Firma de los tokens JWT (obligatorio, si falta el login lanza error) |
| `JWT_EXPIRES_IN` | Expiración del token (default `12h`) |
| `FRONTEND_URL` | Base usada para construir el link de "compartir viaje" (default `https://pagos.sadojtours.com`) |

> ⚠️ **Nota de seguridad**: `.env.example` solo tiene placeholders. Las credenciales reales van en `.env` (ignorado por git). Las credenciales antiguas siguen en el historial de git, así que hay que rotarlas. Los usuarios semilla se definen con `SEED_USERS` (JSON) y ya no están en el código.

---

## 7. Middlewares globales y manejo de errores (`server.js`)

- `cors(corsOptions)` + preflight.
- `express.json()` y `express.urlencoded({ extended: true })` (este último para tolerar proxies/formularios que reescriban el content-type).
- Middleware de auditoría: en cada respuesta con `statusCode >= 400`, registra un error en `logs_actividad` (best-effort, no bloquea la respuesta).
- Error handler global (4 args, al final de la cadena): registra el error y responde `{ ok: false, message }` con `err.status || 500`.
- `process.on('unhandledRejection'/'uncaughtException')`: registran el error en logs y lo imprimen en consola (no matan el proceso).
- Al iniciar: `initDb()` crea tablas base; si falla, el servidor **igual levanta** (para que `/` y `/api/health` sigan respondiendo) pero loggea el error.

---

## 8. Endpoints

Base URL: `/api`. Los marcados con 🔒 requieren `Authorization: Bearer <token>` (JWT).

### General

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Página HTML de bienvenida ("Backend en línea"), solo informativa. |
| GET | `/api/health` | — | Healthcheck: `{ ok: true, message: 'Backend en funcionamiento' }`. |

### Auth — `routes/auth.js` (montado en `/api/auth`)

| Método | Ruta | Auth | Body | Descripción |
|---|---|---|---|---|
| POST | `/api/auth/login` | — | `{ username, password }` | Normaliza `username` a mayúsculas, valida contra `usuarios`, compara password con bcrypt, firma y devuelve `{ token, usuario: { username, nombreDisplay } }`. Registra log de login. 400 si faltan campos, 401 si credenciales inválidas. |
| GET | `/api/auth/me` | 🔒 | — | Devuelve `{ username }` del token actual. Sirve para validar sesión. |

### Viajes — `routes/viajes.js` (montado en `/api/viajes`, todo 🔒)

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| GET | `/api/viajes` | — | Lista todos los viajes (id, nombre, tipo, divisa, fechas, nota, slug, edadMinimaPago), más recientes primero. |
| POST | `/api/viajes` | `{ nombre, fechaInicio?, fechaFin?, nota?, tipo?='resort', divisa?='USD', edadMinimaPago?=0 }` | Crea un viaje. `nombre` requerido (400 si falta). |
| PUT | `/api/viajes/:id` | `{ nombre, fechaInicio?, fechaFin?, nota?, tipo?, divisa?, edadMinimaPago?=0 }` | Edita un viaje existente. `nombre` requerido. |
| DELETE | `/api/viajes/:id` | — | Elimina el viaje **en cascada**: borra pagos → personas → habitaciones → el viaje, en una transacción. |
| POST | `/api/viajes/default` | — | Idempotente: obtiene o crea el viaje "Resort MamaTingo" y le asigna todas las habitaciones que tengan `viaje_id IS NULL` (migración de datos legacy sin viaje asociado). |
| POST | `/api/viajes/:id/compartir` | `{ duracion: '1h'\|'7h'\|'24h'\|'7d'\|'never', tipo?: 'pendientes'\|'completo' }` | Genera (o regenera) un token público de solo-lectura para el viaje, con expiración opcional. Devuelve `linkCompartir` (`${FRONTEND_URL}/viaje-compartido/:token`). Asegura de forma perezosa las columnas necesarias en `viajes`. |
| DELETE | `/api/viajes/:id/compartir` | — | Desactiva el link compartido (`compartir_activo = 0`), sin borrar el token. |

### Viajes público — `routes/viajesPublico.js` (montado en `/api/viajes/publico`, **sin auth**)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/viajes/publico/:token` | Vista de solo lectura de un viaje por `token_compartir`: datos del viaje + habitaciones con personas y pagos anidados. Valida que el link exista (404), esté activo (404 si desactivado) y no haya expirado (410 si `expira_compartir` ya pasó). No requiere JWT — pensado para compartir por WhatsApp/email. |

### Habitaciones — `routes/habitaciones.js` (montado en `/api/habitaciones`, todo 🔒)

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| GET | `/api/habitaciones?viajeId=` | — | Lista habitaciones (opcionalmente filtradas por viaje) con sus personas y pagos anidados (join habitaciones→personas→pagos, agregado en memoria). |
| POST | `/api/habitaciones` | `{ num, tipo, total?, precioNino?, stack?, nota?, etiqueta?, viajeId?, personas?: [{n, esNino?, esGratis?}] }` | Crea una habitación y, en la misma transacción, sus personas iniciales. `num`/`tipo` requeridos. |
| PUT | `/api/habitaciones/:id` | `{ num, tipo, total?, precioNino?, etiqueta?, stack? }` | Edita datos generales de la habitación. |
| POST | `/api/habitaciones/:id/personas` | `{ nombre, esNino?, esGratis? }` | Agrega una persona a una habitación existente, calculando la siguiente `posicion`. |
| DELETE | `/api/habitaciones/:id` | — | Elimina la habitación (y, por FK, sus dependencias según la BD). |
| PATCH | `/api/habitaciones/:id/tipo` | `{ nuevoTipo: 'Single'\|'Doble'\|'Triple' }` | Cambia el tipo de habitación, validando que la capacidad nueva soporte a los ocupantes actuales (400 si no cabe). |
| PUT | `/api/habitaciones/:id/nota` | `{ nota }` | Actualiza la nota libre de la habitación. |
| PUT | `/api/habitaciones/:id/etiqueta` | `{ etiqueta }` | Actualiza la etiqueta (usada para agrupar/reportar, ver `stats.js`). |

### Personas — `routes/personas.js` (montado en `/api/personas`, todo 🔒)

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| PATCH | `/api/personas/:id/gratis` | `{ esGratis }` | Marca/desmarca a la persona como exenta de pago. |
| PUT | `/api/personas/:id` | `{ nombre }` | Renombra a la persona. 404 si no existe. |
| POST | `/api/personas/:id/pagos` | `{ mes, monto }` | Registra un pago para esa persona. |
| PUT | `/api/personas/:id/pagos/:pagoId` | `{ mes, monto }` | Edita un pago existente (validando que pertenezca a esa persona). |
| DELETE | `/api/personas/:id/pagos/:pagoId` | — | Elimina un pago puntual. |
| DELETE | `/api/personas/:id` | — | Elimina a la persona y recalcula/ajusta el `tipo` de su habitación según los ocupantes restantes (transacción). |

### Movimientos — `routes/movimientos.js` (montado en `/api/movimientos`, todo 🔒)

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/api/movimientos` | `{ personaId, destinoHabitacionId }` | Mueve una persona de su habitación actual a otra: valida espacio disponible en destino, actualiza `posicion`, inserta registro en `historial_movimientos`, y recalcula automáticamente el `tipo` (Single/Doble/Triple) tanto de la habitación origen como la destino según la nueva ocupación. Todo en una transacción. |

### Stats / Reportes — `routes/stats.js` (montado en `/api/stats`, todo 🔒)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/stats/dashboard` | Resumen global: por cada viaje, total por cobrar, total pagado, pendiente, cantidad de habitaciones y personas; más un resumen agregado de todos los viajes (totales, % pagado, conteo de resorts vs tours). |
| GET | `/api/stats/reportes/pagos-por-mes?viajeId=` | Suma de pagos y cantidad de pagos agrupados por mes (`Ene`...`Dic`), global o filtrado a un viaje. |
| GET | `/api/stats/reportes/por-etiqueta?viajeId=` | Resumen (habitaciones, personas, por cobrar, pagado, pendiente, %) agrupado por `etiqueta` de habitación, global o por viaje. |
| GET | `/api/stats/reportes/comparativa-viajes` | Tabla comparativa entre todos los viajes: por cobrar, pagado, pendiente, habitaciones, personas, % pagado. |
| GET | `/api/stats/reportes/pagos-mes-viaje` | Matriz de pagos por mes × viaje, pensada para heatmap/tabla cruzada. |
| GET | `/api/stats/viaje/slug/:slug` | Busca un viaje por su `slug` (usado por vistas públicas). 404 si no existe. |
| POST | `/api/stats/viajes/with-slug` | Crea un viaje generando automáticamente un `slug` a partir del nombre (normaliza tildes, minúsculas, guiones; si colisiona, agrega timestamp). |

> Nota: hay solapamiento funcional entre `POST /api/viajes` (en `routes/viajes.js`) y `POST /api/stats/viajes/with-slug` — ambos crean viajes, pero solo el segundo genera `slug`. Si se integra un sistema externo, conviene aclarar cuál es el endpoint "canónico" para crear viajes antes de depender de uno u otro.

### Logs — `routes/logs.js` (montado en `/api/logs`, todo 🔒)

| Método | Ruta | Query | Descripción |
|---|---|---|---|
| GET | `/api/logs?limit=` | `limit` (default 500, máx 1000) | Devuelve la bitácora de actividad (`logs_actividad`) más reciente primero: quién hizo qué acción sobre qué entidad y cuándo. Incluye tanto acciones de usuario (crear/editar/eliminar/login/mover/pago) como errores HTTP≥400 registrados automáticamente. |

---

## 9. Auditoría (`utils/log.js`)

- `registrarLog(usuario, accion, entidad, entidadId, descripcion)`: inserta una fila en `logs_actividad`. Se llama manualmente al final de casi toda operación de escritura (crear/editar/eliminar/mover/pago/login).
- `registrarError(error, context)`: envoltorio que arma una descripción legible y delega en `registrarLog` con `accion: 'error'`. Se usa en el middleware de respuestas ≥400, en el error handler global y en los listeners de `unhandledRejection`/`uncaughtException`.
- Ambas funciones son best-effort: si falla el `INSERT`, solo loguean a consola y no interrumpen el flujo principal.

---

## 10. Puntos a tener en cuenta para integraciones externas

1. **No hay endpoint de creación de usuarios/API keys** — la autenticación actual es pensada para el panel interno (3 usuarios fijos con JWT). Si el sitio público nuevo necesita llamar a esta API server-to-server, hoy tendría que autenticarse como uno de esos usuarios (no ideal) o habría que añadir un mecanismo de API key/servicio.
2. **CORS está cerrado a `pagos.sadojtours.com`** — cualquier fetch desde navegador desde otro dominio será bloqueado; las llamadas desde un backend nuevo (server-to-server) no pasan por CORS y no tienen este problema.
3. **Creación de viajes**: usar `POST /api/viajes` si no se necesita slug, o `POST /api/stats/viajes/with-slug` si sí. El "id_sistema" que debería guardar el backend nuevo es el `id` devuelto por cualquiera de estos dos.
4. **Alta de pasajero (pax)**: no hay un endpoint directo "crear persona con pago" — el flujo real es `POST /api/habitaciones/:id/personas` (agregar persona a una habitación) y luego `POST /api/personas/:id/pagos` si aplica un pago inicial. Esto asume que ya existe una habitación destino; el sistema actual no tiene un concepto de "reserva sin habitación asignada".
5. **Credenciales antiguas en el historial de git**: `.env.example` ya tiene placeholders, pero la contraseña de MySQL y las de los usuarios semilla aparecen en commits anteriores. Hay que rotarlas.
