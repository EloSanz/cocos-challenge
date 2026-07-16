# Decisiones de diseño y supuestos

Documento de decisiones técnicas y supuestos funcionales tomados durante el desarrollo del challenge.

## Arquitectura (Clean Architecture / CQRS Lite)

- **Use Cases & Repositories**: Los 3 módulos principales (`orders`, `portfolio`, `instruments`) están estructurados en base a Casos de Uso específicos (ej. `CreateOrderUseCase`, `SearchInstrumentsUseCase`). Los Controllers consumen UseCases (capa de aplicación) y los UseCases consumen Repositories (capa de datos). Esto garantiza el Principio de Responsabilidad Única (SRP) y aísla la lógica de negocio de la infraestructura.
- **Boundary Enforced**: Se utiliza `tsarch` (`architecture.spec.ts`) para garantizar por CI que la capa de dominio/aplicación jamás importe paquetes HTTP, DTOs o de transporte.
- **Dependency Injection**: Se utilizan `string` tokens para inyectar dependencias (ej. `@Inject('IMutex')`). Esto mantiene consistencia en la app y facilita el debugging nativo de NestJS.
- **Manejo de Errores**: La capa de aplicación lanza excepciones de dominio puras (`EntityNotFoundException`, `BusinessRuleException`). Un filtro global (`DomainExceptionFilter`) las traduce centralizadamente a códigos HTTP (404, 409).
- **Swagger Decorators**: Toda la documentación de Swagger se agrupó en decoradores personalizados (`*.swagger.ts`) para mantener los controllers limpios y legibles.

## Dominio y Lógica de Negocio

- **Balance Centralizado**: La lógica para calcular tenencias y dinero disponible (`projectAccount`) es la única fuente de verdad compartida entre `Orders` (para validar fondos) y `Portfolio` (para mostrar saldos). Deriva el saldo plegando (`fold`) históricamente las órdenes en estado `FILLED`.
- **Fail-Fast Mutex (`KeyedMutex`)**: La concurrencia por usuario (evitar sobregiros por doble click) se maneja con un lock en memoria (`src/infrastructure/mutex/keyed-mutex.ts`), inyectado detrás de la interfaz `IMutex` (`IMutexToken`). Si un usuario envía dos órdenes en simultáneo, el mutex rechaza la segunda con `409 Conflict` (Try-Lock semantics). **Limitación consciente**: la exclusión es *por instancia*; con múltiples instancias hay que reemplazar la implementación por un lock distribuido (Redis / `pg_advisory_xact_lock`). La abstracción `IMutex` permite hacer ese swap sin tocar el caso de uso.
- **Cancelación Atómica**: Para cancelar órdenes, se usa la condición `UPDATE ... WHERE id = ? AND status = 'NEW'` directo contra la DB. Esto previene condiciones de carrera sin requerir locks adicionales.

## Manejo Numérico y Precisión (Dinero)

- **Big.js**: La DB almacena precios como `numeric(10,2)`. Para evitar el drift y los bugs financieros del binario flotante (IEEE-754) de JavaScript, un `ColumnTransformer` convierte automáticamente estos valores a instancias de `Big` (librería `big.js`). Toda la aritmética interna es de precisión arbitraria.
- **Mapeo a DTO**: El dinero se convierte de vuelta a un primitivo `number` (redondeado a 2 decimales) únicamente al serializar la respuesta JSON hacia el usuario (`roundMoney`).
- **Sizes**: Las cantidades (`size`) se mapean a `number` nativo, al ser enteros muy por debajo del límite seguro de JS.

## Supuestos Funcionales y Base de Datos

- **Búsqueda de Instrumentos**: (`GET /api/instruments?q=`). Se excluye explícitamente el instrumento tipo `MONEDA` (`ARS`) ya que representa el saldo de la cuenta y no es un activo operable por el cliente.
- **Market Orders**: Ejecutan de inmediato al precio `close` más reciente provisto por el `marketdata`. Las órdenes LIMIT esperan en el book (`NEW`) al precio indicado por el usuario.
- **Monto (Amount)**: Si el usuario envía `amount` en vez de `size`, se calcula internamente la cantidad máxima de acciones enteras a comprar/vender (`amount / precio`, redondeado hacia abajo).
- **Portfolio sin actividad**: Un usuario sin órdenes `FILLED` previas devuelve `404 Not Found`.
- **Esquema DB Intacto**: `synchronize: false`. La app se adapta al esquema crudo provisto. Los cambios incrementales van por **TypeORM migrations** (`src/database/data-source.ts` + `src/database/migrations/`, scripts `migration:run`/`create`/`revert`); la única hasta ahora es un índice de performance en `orders (userId, status)`.
- **Auditoría (Futura mejora)**: El esquema actual de `db.sql` no contempla campos como `created_at` o `updated_at`. Como mantenemos `synchronize: false`, el ORM no generará este DDL automáticamente. Queda documentado que en un futuro sería ideal agregar estas columnas explícitamente a las entidades (con `@CreateDateColumn` y `@UpdateDateColumn`) y crear la migración SQL correspondiente para llevar un mejor histórico de los registros.
- **Migración preparada, no aplicada**: la migración del índice queda versionada pero **no se corrió** contra la base. Tratándola como una DB productiva, los cambios de schema no se aplican ad hoc ni en el boot de la app (`migrationsRun: false` implícito): se ejecutan en un paso deliberado del pipeline de deploy (`migration:run`), revisable y reversible (`migration:revert`). Además, sobre una tabla grande el índice debería crearse con `CREATE INDEX CONCURRENTLY` fuera de transacción para no bloquear escrituras.

## Escalabilidad (Portfolio)

- **Costo actual**: el portfolio se reconstruye plegando *todas* las órdenes `FILLED` del usuario en cada `GET` (O(n)). El log de órdenes no tiene estado materializado.
- **Mitigación inmediata**: índice `(userId, status)` — evita el full scan y acota la lectura a las filas del usuario (la consulta ya está scopeada por `userId`, no por toda la tabla).
- **Camino a escala** (cuando el volumen lo justifique): agregar en SQL en vez de en Node → *snapshots* para acotar el replay → *read model* materializado (`positions`) actualizado en la transacción del fill (O(1) de lectura). `projectAccount` ya es la única fuente de la lógica, así que pasaría a ser el *projector* sin reescribir negocio.
