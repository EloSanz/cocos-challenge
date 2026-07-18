# Roadmap de Mejoras

### 1. Seguridad Avanzada y Anti-Abuso
- [x] **Rate Limiting (Throttler)**: Instalar `@nestjs/throttler` para evitar que te saturen los endpoints (por ejemplo, limitar la creación de órdenes a 10 por segundo por IP).
- [x] **Helmet**: Instalar `helmet` y agregarlo en tu `main.ts` (`app.use(helmet())`). Es un estándar de la industria que configura cabeceras HTTP de seguridad automáticamente.

### 2. CI/CD (GitHub Actions / GitLab CI)
- [x] **Pipeline Básico**: `.github/workflows/ci.yml` corre Linter, Build, Unit Tests (con umbral de cobertura) y E2E en cada push/PR a `main`. *(Nota: no incluye Regresión (Cucumber) — esa suite pega contra un servidor + DB vivos, requeriría un service container de Postgres y levantar la app en el runner; queda como mejora aparte si se quiere agregar.)*

### 3. Logs Estructurados (Ideal para tu stack con Loki)
- [x] **Pino (nestjs-pino)**: Usar Pino en vez del logger por defecto de NestJS para imprimir en JSON.
- [x] **Correlation ID**: Middleware que genere un UUID (`x-request-id`) por cada request y lo inyecte en los logs para rastrear cada petición en Grafana/Loki fácilmente.

### 4. Estándares en el Repositorio
- [x] **Lint-Staged + Commitlint**: Obligar a que los mensajes sigan el formato de *Conventional Commits* y solo analizar los archivos modificados en el pre-commit.
- [x] **.nvmrc + engines**: Fijar la versión de Node en `package.json` y `.nvmrc` para evitar el clásico "en mi máquina anda".

### 5. Arquitectura y Mantenimiento
- [x] **API Versioning**: Activarlo en `main.ts` (`app.enableVersioning()`) para que los endpoints sean `/api/v1/orders`.
- [x] **Fix bugs de README**: Corregidos (`POST /orders/:id/cancel` en vez de `DELETE`, `GET /portfolio/:userId` en vez de "usuario autenticado"). Los endpoints ahora son una tabla que apunta a Swagger/Postman/Bruno en vez de curls embebidos por request.

*(Nota: Omitimos LICENSE ya que al ser un challenge privado está correcto usar "UNLICENSED" y "private": true).*