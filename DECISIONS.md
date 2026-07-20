# Decisiones de diseño y supuestos

Documento de decisiones técnicas y supuestos funcionales tomados durante el desarrollo del challenge.

## Arquitectura (Clean Architecture)

- **Use Cases & Repositories**: Los 3 módulos principales (`orders`, `portfolio`, `instruments`) están estructurados en base a Casos de Uso específicos (ej. `CreateOrderUseCase`, `SearchInstrumentsUseCase`). Los Controllers consumen UseCases (capa de aplicación) y los UseCases consumen Repositories (capa de datos). Esto garantiza el Principio de Responsabilidad Única (SRP) y aísla la lógica de negocio de la infraestructura.
- **Boundary Enforced**: Se utiliza `tsarch` (`architecture.spec.ts`) para garantizar por CI que la capa de dominio/aplicación jamás importe paquetes HTTP, DTOs o de transporte.
- **Dependency Injection**: Se utilizan `string` tokens para inyectar dependencias (ej. `@Inject('IMutex')`, `IPortfolioRepositoryToken`). Esto desacopla el caso de uso de la implementación concreta (repos, mutex) y facilita el testing con mocks.
- **Manejo de Errores**: La capa de aplicación lanza excepciones de dominio puras (`EntityNotFoundException`, `BusinessRuleException`, `InvalidInputException`, `ResourceLockedException`). Un filtro global (`DomainExceptionFilter`) las traduce centralizadamente a códigos HTTP (400, 404, 409).
- **Swagger inline**: La documentación de OpenAPI vive como decoradores `@ApiResponse` + JSDoc en cada controller (se eliminaron los archivos `*.swagger.ts` intermedios para reducir indirección). Swagger UI se sirve en `/api/docs`.

## Dominio y Lógica de Negocio

- **Balance Centralizado (`projectAccount`)**: La lógica para derivar tenencias y dinero disponible es la única fuente de verdad, compartida entre `Orders` (validar fondos/tenencia al crear) y `Portfolio` (mostrar saldos). Deriva el estado plegando (`fold`) las órdenes `FILLED` (`BUY`/`SELL`/`CASH_IN`/`CASH_OUT`). Acepta un estado inicial, lo que permite reusarlo como *projector* incremental sobre un snapshot (ver más abajo).
- **Fail-Fast Mutex (`KeyedMutex`)**: La concurrencia por usuario (evitar sobregiros por doble click) se maneja con un lock en memoria (`src/infrastructure/mutex/keyed-mutex.ts`), detrás de la interfaz `IMutex`. Si un usuario envía dos órdenes en simultáneo, el mutex rechaza la segunda con `409 Conflict` (Try-Lock). La actualización de snapshots usa un lock **separado** (`snapshot:<id>`) para que el trabajo en background nunca rechace una orden del usuario. **Limitación consciente**: la exclusión es *por instancia*; en multi-instancia se reemplaza por un lock distribuido (Redis / `pg_advisory_xact_lock`) sin tocar el caso de uso.
- **Cancelación Atómica**: Para cancelar se usa `UPDATE ... WHERE id = ? AND status = 'NEW'` directo contra la DB. El chequeo de estado y la transición ocurren en una sola sentencia → sin condición de carrera y sin locks adicionales. Solo aplica a órdenes `NEW`, que nunca fueron `FILLED`, así que cancelar no afecta el portfolio.

## Portfolio: Event Sourcing + Snapshots (implementado)

El portfolio se **deriva** del log de órdenes `FILLED`, que es la única **fuente de verdad** (append-only). Recalcular todo el log en cada lectura no escala, así que se materializa un **read-model**: la tabla `portfolio_snapshots` (una fila por usuario con `availableCash`, `positions` jsonb y un marcador `lastOrderId`). El snapshot es un **cache derivado**, nunca la verdad.

- **Escritura (asíncrona)**: al ejecutarse una orden `FILLED`, `create-order` emite `OrderFilledEvent` (`@nestjs/event-emitter`) *después* de responder. `OrderFilledListener` llama `ProjectionManager.updateSnapshot(userId)` en background: lee el snapshot, trae las órdenes con `id > lastOrderId` y las pliega con `projectAccount`. La respuesta de compra/venta no espera esta actualización.
- **Lectura (consistencia fuerte, "Opción B")**: `getProjection` devuelve **snapshot + órdenes filled posteriores a `lastOrderId`, proyectadas al vuelo**. En el caso normal el delta es vacío (lectura O(posiciones abiertas)); si el listener aún no procesó una orden, se proyecta en el momento. La lectura **siempre es correcta**.
- **Robustez / self-healing**: un evento perdido o un listener que falla solo cuesta *performance* (snapshot stale), nunca *correctitud* — la lectura re-proyecta el delta y el próximo evento lo sana. `lastOrderId` usa el `id` autoincremental como corte de eventos; snapshot y fallback de scan completo ordenan por `id ASC` (orden determinístico).
- **Precisión**: `avgPrice` **no se persiste**; se recalcula `totalCost / shares` al cargar. `totalCost` es exacto a 2dp (suma de `precio[2dp] × size[int]`), mientras que `avgPrice` puede ser periódico — persistirlo truncado haría divergir el snapshot del scan completo.
- **Lecturas scopeadas**: precios (`marketdata`) y metadata (`instruments`) se traen solo para los instrumentos **tenidos** (`WHERE id IN (...)`), no para todo el mercado; el costo de la lectura es proporcional a las posiciones abiertas.
- **Dos rendimientos por posición**: `totalReturnPct` (desde la compra) y `dailyReturnPct` (movimiento del día del instrumento, `(close - previousClose) / previousClose`, según la consigna).
- **Portfolio sin actividad**: un `GET` de un usuario **sin ninguna orden `FILLED`** devuelve `404`. Un usuario que **operó pero quedó en cero** (ej. `CASH_IN` + `CASH_OUT` total) devuelve `200` con portfolio vacío — el 404 significa *"sin actividad"*, no *"saldo cero"*.
- **Restricción del modelo**: asume log append-only. Mutar/borrar una orden `FILLED` histórica dejaría el snapshot inconsistente (no se reprocesa lo previo a `lastOrderId`); por eso se removió el módulo de borrado administrativo. Para reconstruir snapshots de usuarios existentes hay un script (`src/scripts/pre-warm-snapshots.ts`).

## Manejo Numérico y Precisión (Dinero)

- **Big.js**: las columnas de dinero son `numeric(15,2)`. Para evitar el drift del flotante binario (IEEE-754), un `ColumnTransformer` (`big-decimal.transformer.ts`) convierte automáticamente estos valores a instancias de `Big`. Toda la aritmética interna es de precisión arbitraria.
- **Mapeo a DTO**: el dinero se convierte a `number` (redondeado a 2 decimales, `roundMoney`) únicamente al serializar la respuesta JSON.
- **Sizes**: las cantidades (`size`) son `number` nativo (enteros muy por debajo del límite seguro de JS).

## Base de Datos y Migraciones

- **`synchronize: false`**: la app no genera DDL en el boot. Los cambios de schema van por **TypeORM migrations** (`src/database/data-source.ts` + `src/database/migrations/`, ejecutadas en un paso deliberado del pipeline con `migration:run`, reversible con `migration:revert`). Hay 3:
  1. `AddOrdersUserStatusIndex` — índice `orders(userId, status)` para acotar el scan de `FILLED` (en tablas grandes, idealmente `CREATE INDEX CONCURRENTLY` fuera de transacción).
  2. `AddAuditColumns` — `created_at`/`updated_at` de forma aditiva e idempotente. **Preparada pero no aplicada a las entidades** (decisión consciente para no acoplar el modelo todavía).
  3. `CreatePortfolioSnapshotTable` — la tabla del read-model (FK a `users` con `ON DELETE CASCADE`).
- **`db.sql` vs migraciones**: en Docker el schema local lo crea `db.sql` (montado en `/docker-entrypoint-initdb.d/`, corre una vez al inicializar el volumen). Contra una DB real (Neon) el schema se crea con `migration:run`. Ambos crean `portfolio_snapshots`, así que se elige un mecanismo por entorno (correr `migration:run` sobre una DB ya inicializada por `db.sql` fallaría con *"already exists"*).

## Entornos y Configuración por Scope

- **Selección por `NODE_ENV`** (`CoreModule` carga `.env.<NODE_ENV>` + `.env`, validado con Joi al boot — fail-fast si falta una var requerida):
  - `test` → DataSource `better-sqlite3` in-memory (`synchronize: true`), sin DB externa.
  - `development` → Postgres local (`.env.development`: `localhost/localdb`).
  - `production` → Postgres remoto/Neon (`.env.production`, gitignored).
- **Secretos**: `.env.production` está en `.gitignore` **y** `.dockerignore` (nunca se commitea ni entra a la imagen). El único archivo versionado es el template `.env.production.example` (placeholders). Las env vars inyectadas (docker-compose) ganan sobre el archivo.
- **Neon requiere SSL**: `DB_SSL=true` (sin esto la conexión falla). El `app` de docker-compose lee `DB_HOST`/`DB_SSL` de env para poder apuntarse a Neon (`--env-file .env.production`), con las credenciales del container `db` local desacopladas.

## Cross-cutting (`CoreModule` + `main.ts`)

- **Versionado URI** `/api/v1/...` (health es version-neutral: es infra, no contrato).
- **`ValidationPipe`** global (`whitelist` + `forbidNonWhitelisted` + `transform`); **Helmet** y **CORS**.
- **Rate limiting** (`ThrottlerModule`, 100 req/min por IP) y **cache en memoria** (`CacheModule`, TTL 60s) para la búsqueda de instrumentos.
- **Logging** estructurado con `nestjs-pino` (stack Grafana/Loki/Promtail vía compose).

## Supuestos Funcionales

- **Búsqueda de Instrumentos** (`GET /api/v1/instruments?q=`): excluye el instrumento tipo `MONEDA` (cash) — no es un activo operable. Match parcial case-insensitive (`ILIKE`) sobre ticker o nombre, paginado.
- **Market Orders**: ejecutan de inmediato al `close` más reciente de `marketdata`. Las LIMIT esperan en el book (`NEW`) al precio del usuario.
- **Monto (`amount`)**: si se envía `amount` en vez de `size`, se calcula la cantidad máxima de acciones enteras (`floor(amount / precio)`, sin fracciones).

## Testing

- **Unit (Jest)**: lógica de dominio (proyección, use cases, converter, mutex) con umbral de cobertura 100% sobre `account-projection.ts`.
- **E2E (sqlite in-memory)**: integración de módulos + endpoints reales.
- **Regresión (Cucumber/BDD)** y **stress**: flujos end-to-end contra la API levantada (rate limiting incluido).
