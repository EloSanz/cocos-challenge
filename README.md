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
- `src/orders`: Contiene la lógica de negocio, validación y persistencia para enviar y cancelar órdenes (Market y Limit).
- `src/portfolio`: Lógica de lectura de cuentas, cálculo de rendimientos y activos.
- `src/admin`: Capa administrativa protegida por `x-api-key`.
- `src/database`: Configuración top-level de persistencia, entidades globales y scripts de migración.
- `src/common`: Excepciones de dominio, filtros globales de error y middlewares (ej. Logging).

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
| `DELETE` | `/api/v1/admin/{orders\|users\|instruments\|marketdata}/:id` | Borrado físico. Requiere header `x-api-key`; deshabilitado por completo fuera de `NODE_ENV=development`. |

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
# NOTA: Por defecto, Docker Compose arranca en modo "production", lo que deshabilita
# los endpoints de /admin por seguridad. Si necesitas probar las rutas de administrador
# localmente, debes forzar explícitamente el entorno de desarrollo:
# NODE_ENV=development docker-compose up -d --build
docker-compose up -d --build

# 3. Correr la suite de Unit Tests (con umbral de cobertura sobre la lógica de dominio)
npm run test:cov

# 4. Correr la suite de Tests End-to-End (Validación de integraciones, SQLite en memoria)
npm run test:e2e

# 5. Correr la suite de Regresión (BDD con Cucumber, requiere la API levantada)
npm run test:regression
```

CI (`.github/workflows/ci.yml`) reproduce los pasos 3 y 4 más lint y build en cada push/PR a `main`.
