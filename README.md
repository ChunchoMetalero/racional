# Racional

Repositorio de la prueba tecnica con dos entregables:

- [racional-api](racional-api) - API de inversion (NestJS + PostgreSQL/Prisma)
- [racional-app](racional-app) - visualizacion en tiempo real (React + Firestore)

## Accesos rapidos

- [API - instrucciones y rutas](racional-api/README.md)
- [App - instrucciones y arquitectura](racional-app/README.md)

## Requisitos generales

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose (solo para la API)

## Como ejecutar

### API (NestJS)

Opcion A: stack completo con Docker (recomendado)

```bash
cd racional-api
cp .env.example .env
docker compose up
```

Opcion B: PostgreSQL en Docker + API local

```bash
cd racional-api
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:setup
pnpm start:dev
```

API disponible en `http://localhost:3000/api/v1`.
Swagger en `http://localhost:3000/api/v1/docs`.

### App (React)

```bash
cd racional-app
pnpm install
pnpm dev
```

App disponible en `http://localhost:5173`.

## Entregable 1 - API de inversion ([racional-api](racional-api))

Requisitos cubiertos:

- Depositos y retiros con monto y fecha
- Ordenes de compra y venta
- Edicion de informacion del usuario
- Edicion de informacion del portafolio
- Consulta de total del portafolio
- Consulta de ultimos movimientos

Detalle completo en [racional-api/README.md](racional-api/README.md).

## Entregable 2 - Inversiones en tiempo real ([racional-app](racional-app))

Requisitos cubiertos:

- Conexion a Firestore
- Listener al documento investmentEvolutions/user1
- Grafico en tiempo real
- Enfoque en experiencia de usuario

Detalle completo en [racional-app/README.md](racional-app/README.md).

## Uso de IA

La integracion y decisiones asistidas por IA se documentan en los README de cada proyecto:

- [racional-api/README.md](racional-api/README.md)
- [racional-app/README.md](racional-app/README.md)
