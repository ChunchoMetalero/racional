# Racional API

API REST de inversiones construida con **NestJS v11** y **PostgreSQL** (via Prisma 7) que permite a los usuarios gestionar portafolios, registrar movimientos de efectivo y operar instrumentos financieros.

---

## Instrucciones para ejecutar la API

### Prerrequisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose

---

### Opción A — Stack completo con Docker (más simple)

```bash
cp .env.example .env   # Edita JWT_SECRET con un valor seguro
docker compose up
```

El proceso de arranque hace automáticamente:
1. Levanta PostgreSQL y espera a que esté listo (`healthcheck`)
2. Construye la imagen de la API — durante el build ejecuta `prisma generate` (genera el cliente TypeScript a partir de `schema.prisma`)
3. Al iniciar el contenedor ejecuta `prisma migrate deploy` — aplica todas las migraciones pendientes y crea las tablas
4. Arranca el servidor NestJS

La API queda disponible en `http://localhost:3000/api/v1`. No se requiere ningún paso adicional de base de datos.

---

### Opción B — Solo PostgreSQL en Docker + API en local (hot-reload)

```bash
# 1. Configura variables de entorno
cp .env.example .env          # Edita DATABASE_URL y JWT_SECRET

# 2. Instala dependencias
pnpm install

# 3. Levanta la base de datos
docker compose up -d postgres

# 4. Genera el cliente Prisma y aplica migraciones (un solo comando)
pnpm db:setup
# Equivale a: prisma generate && prisma migrate dev
# - prisma generate: genera src/generated/prisma/ desde schema.prisma (no requiere DB)
# - prisma migrate dev: crea las tablas en la DB

# 5. Inicia el servidor con hot-reload
pnpm start:dev
```

La API queda disponible en `http://localhost:3000`.

> **Nota:** si modificas `prisma/schema.prisma`, vuelve a ejecutar `pnpm db:setup` con un nombre para la migración:
> ```bash
> pnpm exec prisma migrate dev --name <nombre-del-cambio>
> pnpm prisma:generate
> ```

---

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/racional?schema=public` |
| `JWT_SECRET` | Secreto para firmar JWTs | `change-me-to-a-long-random-string` |
| `PORT` | Puerto del servidor | `3000` |
| `POSTGRES_USER` | Usuario del contenedor Docker | `racional` |
| `POSTGRES_PASSWORD` | Contraseña del contenedor Docker | `racional` |
| `POSTGRES_DB` | Base de datos del contenedor Docker | `racional` |

### Documentación interactiva (Swagger)

```
http://localhost:3000/api/v1/docs
```

### Comandos de desarrollo

```bash
pnpm start:dev     # Servidor con hot-reload
pnpm build         # Compila TypeScript a dist/
pnpm start:prod    # Ejecuta el build compilado

pnpm test          # Tests unitarios
pnpm test:e2e      # Tests end-to-end
pnpm test:cov      # Tests con cobertura

pnpm lint          # ESLint con auto-fix
pnpm format        # Prettier
```

### Comandos Prisma útiles

```bash
pnpm db:setup                        # generate + migrate dev (setup inicial o tras cambiar schema)
pnpm exec prisma generate            # Regenera el cliente TS desde schema.prisma
pnpm exec prisma migrate dev         # Aplica/crea migraciones en desarrollo
pnpm exec prisma migrate deploy      # Aplica migraciones en producción (sin interactividad)
pnpm exec prisma migrate reset       # Borra y recrea la DB (solo desarrollo)
pnpm exec prisma studio              # Abre el explorador visual de la base de datos
```

---

## Rutas de la API

URL base: `/api/v1`
Todas las rutas requieren `Authorization: Bearer <JWT>` salvo las marcadas como públicas.

### Autenticación

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Crea usuario y portafolio por defecto; retorna JWT | Pública |
| POST | `/auth/login` | Autentica usuario; retorna JWT | Pública |

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users/me` | Obtiene perfil del usuario autenticado |
| PATCH | `/users/me` | Edita información personal (nombre, apellido, teléfono) |

### Portafolios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/portfolios` | Lista los portafolios del usuario |
| GET | `/portfolios/:id` | Obtiene un portafolio específico |
| PATCH | `/portfolios/:id` | Edita nombre y/o descripción del portafolio |
| GET | `/portfolios/:id/value` | Valor libro: `cashBalance + Σ(qty × avgCostBasis)` con detalle de posiciones |

### Transacciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/portfolios/:portfolioId/transactions/deposit` | Registra un depósito de efectivo |
| POST | `/portfolios/:portfolioId/transactions/withdrawal` | Registra un retiro de efectivo (valida saldo suficiente) |
| GET | `/portfolios/:portfolioId/transactions` | Lista movimientos (paginado; `?type=DEPOSIT\|WITHDRAWAL`) |

### Órdenes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/portfolios/:portfolioId/orders/buy` | Registra una compra de acciones |
| POST | `/portfolios/:portfolioId/orders/sell` | Registra una venta de acciones (valida posición suficiente) |
| GET | `/portfolios/:portfolioId/orders` | Lista órdenes (paginado; `?ticker=AAPL&side=BUY\|SELL`) |

---

## Modelo de datos

```
┌──────────┐  1 ──── 1  ┌─────────────┐  1 ──── N  ┌────────────┐
│   User   │────────────│  Portfolio  │────────────│  Position  │
└──────────┘            └─────────────┘            └────────────┘
      │                       │
      │ 1                     │ 1
      │                       │
      ▼ N                     ▼ N
┌─────────────┐        ┌──────────────┐
│ Transaction │        │    Order     │
└─────────────┘        └──────────────┘
```

### Entidades

**`User`**
Almacena credenciales (`email`, `passwordHash`) y datos personales (`firstName`, `lastName`, `phoneNumber`). La contraseña se hashea con bcrypt (10 salt rounds) y nunca se expone en las respuestas.

**`Portfolio`**
Relación 1-a-1 con `User`. Centraliza el saldo en efectivo (`cashBalance`) y actúa como contenedor de posiciones y movimientos. Se crea automáticamente al registrar el usuario — no requiere paso adicional.

**`Position`**
Índice único `(portfolioId, ticker)`. Mantiene la cantidad de acciones en cartera y el **precio promedio ponderado** (`avgCostBasis`). Se recalcula en cada compra:

```
avgCostBasis = (oldQty × oldAvg + newQty × newPrice) / (oldQty + newQty)
```

Si la cantidad llega a cero al vender, el registro se elimina.

**`Transaction`**
Registra cada depósito o retiro con monto, fecha y notas opcionales. Pertenece tanto al `User` como al `Portfolio` para simplificar consultas de auditoría.

**`Order`**
Registra cada compra o venta con `ticker`, `quantity`, `price` y `totalValue` (precalculado y persistido para auditoría). Pertenece tanto al `User` como al `Portfolio`.

### Decisiones de diseño

| Decisión | Justificación |
|----------|---------------|
| `Decimal(18,2)` para montos en efectivo | Evita errores de punto flotante inherentes a `float` en aritmética financiera |
| `Decimal(18,8)` para precios y cantidades | Soporta instrumentos fraccionables (crypto, ETFs con muchos decimales) |
| Fechas almacenadas como `DATE` en UTC (`T00:00:00.000Z`) | Previene desplazamientos de zona horaria: `2024-01-15` siempre es el 15 independiente del servidor |
| `isolationLevel: 'Serializable'` en todas las escrituras financieras | Previene race conditions: doble gasto, oversell, retiros concurrentes por encima del saldo |
| `WHERE id = :id AND userId = :userId` en cada consulta de recursos | Valida existencia y propiedad en un único round-trip a la base de datos (no hay paso separado de autorización) |
| `totalValue` desnormalizado en `Order` | Preserva el valor histórico exacto de la orden; si el precio se corrigiera luego, el registro histórico queda intacto |
| Portfolio creado automáticamente en el registro | Simplifica la experiencia del usuario: puede operar desde el primer momento sin setup adicional |
| Relación `User → Portfolio` 1-a-1 | Modelo de datos adecuado para el alcance del challenge; extensible a 1-N removiendo el `@unique` en `Portfolio.userId` y migrando los datos existentes |

---

## Uso de IA

Este proyecto fue desarrollado con asistencia de herramientas de IA como apoyo al flujo de trabajo desde el inicio.

### Cómo se integró

**Scaffolding y estructura:** el asistente generó la estructura inicial de módulos NestJS (auth, users, portfolios, transactions, orders), la configuración de Prisma con el schema financiero, los guards globales y la configuración de ValidationPipe.

**Lógica de negocio:** La lógica de promedio ponderado en órdenes de compra, el manejo de transacciones `Serializable` y las validaciones de saldo se desarrollaron iterativamente — el asistente propuso implementaciones que luego se refinaron en función de los requisitos exactos.

**Decisiones de modelo de datos:** Se discutieron los trade-offs del esquema (precisión decimal, campo `totalValue` desnormalizado, almacenamiento de fechas en UTC, relación User↔Portfolio) y las justificaciones obtenidas se incorporaron directamente al diseño final.

**DTOs y validaciones:** Los decoradores de `class-validator` para cada DTO (incluyendo regex de fechas YYYY-MM-DD y formato de tickers) fueron generados y revisados con el asistente.

**Revisión de código:** Al finalizar cada módulo, el asistente revisó el código buscando inconsistencias, posibles vulnerabilidades (inyección, exposición de datos sensibles) y cobertura de casos borde financieros.

### Impacto

El uso de IA redujo significativamente el tiempo en tareas repetitivas (boilerplate de módulos, decoradores Swagger, configuración de testing) y permitió concentrar el esfuerzo en las reglas de negocio que requieren mayor atención: aritmética financiera con precisión exacta, aislamiento de transacciones y seguridad de ownership.
