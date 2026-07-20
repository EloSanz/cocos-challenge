# Cocos Challenge API

[![CI](https://github.com/EloSanz/cocos-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/EloSanz/cocos-challenge/actions/workflows/ci.yml)

API RESTful desarrollada para el desafío de Cocos, encargada de la gestión de instrumentos financieros, órdenes de mercado y visualización de portafolios.

## Tecnologías Usadas
- **NestJS**: Framework principal de Node.js.
- **TypeScript**: Lenguaje fuertemente tipado.
- **PostgreSQL**: Base de datos relacional.
- **TypeORM**: ORM para interactuar con la base de datos y manejar migraciones.
- **Docker & Docker Compose**: Contenedorización de la aplicación y servicios anexos.
- **Jest & Cucumber**: Herramientas para Unit Testing, E2E y Behavior-Driven Development (Tests de regresión).
- **Swagger**: Documentación automática OpenAPI.
- **Grafana + Loki + Promtail**: Stack completo de observabilidad y recolección de logs HTTP.
- **Bruno / Postman**: Colecciones de requests (`/bruno`, `/postman`) para probar la API localmente.
- **GitHub Actions**: CI que corre lint, build, unit tests (con umbral de cobertura) y e2e en cada push/PR.
- **API Versioning**: URI versioning (`app.enableVersioning`) — todos los endpoints viven bajo `/api/v1/...`, excepto `/api/health` (version-neutral, es infraestructura).

## Estructura del Proyecto
El proyecto está diseñado siguiendo principios de Arquitectura Limpia (Clean Architecture / Hexagonal), agrupado por módulos de funcionalidad (Package by Feature):

- `src/instruments`: Maneja la búsqueda de instrumentos. Incorpora **Caché en Memoria** para optimizar consultas recurrentes.
- `src/orders`: Contiene la lógica de negocio, validación y persistencia para enviar y cancelar órdenes (Market y Limit). Emite `OrderFilledEvent` al ejecutarse una orden.
- `src/portfolio`: Lógica de lectura de cuentas, cálculo de rendimientos y activos. Incluye el **motor de proyección de snapshots** (`ProjectionManager`) — ver [Arquitectura: Portfolio Snapshots](#arquitectura-portfolio-snapshots-event-sourcing).
- `src/database`: Configuración top-level de persistencia, entidades globales y scripts de migración.
- `src/common`: Excepciones de dominio, filtros globales de error, proyección de cuenta (`account-projection`) y utilidades de dinero (`Big`).
- `src/scripts`: Scripts operativos ejecutables fuera del ciclo HTTP (ej. `pre-warm-snapshots` para backfillear snapshots de usuarios existentes).

## Arquitectura: Portfolio Snapshots (Event Sourcing)

El portafolio se deriva del **log de órdenes FILLED**, que es la única **fuente de verdad**. Recalcular ese log entero en cada lectura no escala, así que se agrega un **read-model** proyectado: la tabla `portfolio_snapshots` (una fila por usuario con `availableCash`, `positions` y un marcador `lastOrderId`). El snapshot es un **cache derivado**, nunca la verdad.

### Escritura (asíncrona, fuera del request)
1. Al ejecutarse una orden (`FILLED`), `create-order` emite un `OrderFilledEvent` (`@nestjs/event-emitter`) **después** de responder.
2. `OrderFilledListener` toma el evento y llama a `ProjectionManager.updateSnapshot(userId)`.
3. El update lee el snapshot, trae las órdenes con `id > lastOrderId`, las proyecta sobre el estado guardado (`projectAccount` acepta un estado inicial) y persiste el nuevo snapshot.
4. Las escrituras se serializan por usuario con un `KeyedMutex` (key `snapshot:<id>`, separada de la de creación de órdenes) para evitar *lost updates*.

### Lectura (consistencia fuerte — "Opción B")
`GetPortfolio` no confía ciegamente en el snapshot: `getProjection` devuelve **snapshot + órdenes filled después de `lastOrderId`, proyectadas al vuelo**. En el caso normal (snapshot al día) el delta es vacío y la lectura es O(posiciones abiertas); si el listener aún no procesó una orden, se proyecta en el momento. **La lectura siempre es correcta.**

### Por qué es robusto
- **Un evento perdido o un listener que falla solo cuesta performance, nunca correctitud**: el snapshot queda stale, pero la lectura re-proyecta el delta y el próximo evento lo sana (self-healing).
- `lastOrderId` usa el `id` autoincremental como corte de eventos — orden determinístico y coherente entre el snapshot y el fallback de scan completo (ambos ordenan por `id ASC`).
- **Precisión**: `avgPrice` **no se persiste**; se recalcula como `totalCost / shares` al cargar. `totalCost` siempre es exacto a 2dp (suma de `precio[2dp] × size[int]`), mientras que `avgPrice` puede ser periódico — persistirlo truncado haría divergir el snapshot del scan completo.

### Requisito operativo
Como el funds-check de creación de órdenes también lee vía `getProjection`, **la tabla `portfolio_snapshots` debe existir** (correr las migraciones) antes de operar. Para usuarios preexistentes, backfilleá los snapshots una vez:

```bash
npm run migration:run                         # crea la tabla portfolio_snapshots
npx ts-node src/scripts/pre-warm-snapshots.ts # backfill de snapshots existentes (opcional)
```

### Restricción del modelo
El diseño asume un **log de órdenes append-only**. Mutar o borrar físicamente una orden `FILLED` histórica dejaría el snapshot inconsistente (no se reprocesa lo que quedó por debajo de `lastOrderId`); por eso el módulo de borrado administrativo fue removido. Cancelar es seguro: solo aplica a órdenes `NEW`, que nunca afectan la proyección.

## Puertos y Servicios
Al levantar el entorno mediante Docker Compose, los siguientes servicios quedan expuestos en tu máquina local:

- **API NestJS**: [http://localhost:3000](http://localhost:3000)
- **Documentación Swagger**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Panel de Grafana (Logs)**: [http://localhost:3001](http://localhost:3001)
- **Base de Datos PostgreSQL**: `localhost:5432`

## Endpoints

La fuente de verdad es **Swagger** (`/api/docs`, siempre sincronizado con el código) — esta tabla es solo un mapa rápido. Para probar requests reales, importá la colección de **Postman** (`/postman`) o **Bruno** (`/bruno`).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/instruments?q=` | Busca instrumentos por ticker o nombre (cacheado en memoria). |
| `GET` | `/api/v1/portfolio/:userId` | Saldo disponible, tenencias y rendimiento del usuario. |
| `POST` | `/api/v1/orders` | Envía una orden MARKET o LIMIT (compra/venta). |
| `POST` | `/api/v1/orders/:id/cancel` | Cancela una orden propia, solo si está en estado `NEW`. |
| `GET` | `/api/health` | Liveness/readiness probe (chequea la conexión a la DB). **Sin versionar**: es infra, no contrato de API. |

Smoke test rápido una vez levantado el stack:
```bash
curl http://localhost:3000/api/health
```

## Setup y Tests

Para ejecutar el proyecto localmente, solo necesitas tener Docker y Node instalados.

```bash
# 1. Instalar dependencias locales (útil para el autocompletado y tests)
npm install

# 2. Levantar la infraestructura completa (App, BD, Logs)
docker-compose up -d --build

# 3. Correr las migraciones (crea la tabla portfolio_snapshots, requerida para operar)
npm run migration:run

# 4. Correr la suite de Unit Tests (con umbral de cobertura sobre la lógica de dominio)
npm run test:cov

# 5. Correr la suite de Tests End-to-End (Validación de integraciones, SQLite en memoria)
npm run test:e2e

# 6. Correr la suite de Regresión (BDD con Cucumber, requiere la API levantada)
npm run test:regression
```

CI (`.github/workflows/ci.yml`) reproduce los unit tests y e2e más lint y build en cada push/PR a `main`.
