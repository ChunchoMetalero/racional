# Racional — Mis Inversiones en Tiempo Real

Visualización interactiva del portafolio de inversión con datos en tiempo real desde Firestore, desarrollada como prueba técnica para Racional.

## Funcionalidades

- Gráfico de área con la evolución histórica del portafolio
- 4 métricas clave: valor actual, retorno total, ganancia/pérdida y retorno diario
- Tabla de movimientos con paginación y ordenamiento (TanStack Table)
- Indicador de conexión en tiempo real (pulso verde / reconectando)
- Dark mode con detección automática de preferencia del sistema

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Estilos | Tailwind CSS v4 + shadcn/ui (New York) |
| Base de datos | Firebase v12 / Firestore |
| Gráfico | Recharts 3 |
| Tabla | TanStack Table v8 |
| Fechas | date-fns v4 |
| Íconos | Lucide React |

## Cómo correr el proyecto

> Requiere Node 20+ y pnpm.

```bash
# Crear archivo de entorno (completar con tus credenciales de Firebase)
# Linux/macOS
cp .env.example .env
# Windows
copy .env.example .env

# Instalar dependencias
pnpm install

# Levantar servidor de desarrollo
pnpm dev
# → http://localhost:5173

# Build de producción
pnpm build
```


## Arquitectura

```
src/
├── config/
│   └── firebase.ts               # Singleton de Firestore
├── services/
│   └── portfolio.service.ts      # Suscripción onSnapshot (sin React)
├── hooks/
│   ├── usePortfolioEvolution.ts  # Estado + cleanup del listener
│   └── useTheme.ts               # Dark mode persistido en localStorage
├── components/
│   ├── Dashboard/                # Orquestador principal
│   ├── PortfolioChart/           # Gráfico de área (Recharts)
│   ├── MovementsTable/           # Tabla paginada (TanStack Table)
│   ├── MetricCard/               # Tarjeta de KPI
│   ├── RealtimeIndicator/        # Indicador de conexión en vivo
│   ├── ThemeToggle/              # Switch dark/light
│   ├── LoadingState/             # Skeleton de carga
│   └── ErrorState/               # Estado de error con mensaje
└── types/
    └── portfolio.ts              # Interfaces TypeScript del documento Firestore
```

**Decisiones de diseño relevantes:**

- Separé responsabilidades para mantener el código simple de razonar: el servicio escucha Firestore y el hook maneja estado/ciclo de vida en React.
- El dark mode se inicializa en `index.html` antes de montar React, evitando el flash de tema incorrecto en la primera carga.

## Uso de I.A. en el flujo de trabajo

Este proyecto lo desarrollé usando Claude Code como apoyo de programación.

### 1. Planning asistido

Antes de escribir código, abrí una sesión de planificación con Claude Code. Le describí el enunciado y le pedí que propusiera la arquitectura, el stack y el orden de implementación. Claude generó un plan detallado con componentes, capas y decisiones tecnológicas.

Revisé ese plan, lo ajusté (estructura de carpetas, enfoque del dark mode, elección de librerías) y solo entonces le di luz verde para comenzar a codear.

### 2. Generación de código

Con el plan aprobado, Claude Code implementó los componentes de forma incremental y en orden lógico:

1. Configuración de Firebase y tipos TypeScript
2. Capa de servicio (`onSnapshot`)
3. Hook personalizado (`usePortfolioEvolution`)
4. Componentes UI base (shadcn)
5. `PortfolioChart`, `MetricCard`, `RealtimeIndicator`, `ThemeToggle`
6. `MovementsTable` con TanStack Table
7. `Dashboard` ensamblando todo
8. Estados de carga y error

### 3. Revisión y correcciones manuales

No acepté el código sin revisión. Corregí manualmente varias partes:

- El formateo de valores monetarios para manejar correctamente los rangos.
- El color del gráfico, porque el propuesto inicialmente no era apropiado.
- El layout del header del Dashboard para alinear correctamente `RealtimeIndicator` y `ThemeToggle` en mobile y desktop

### 4. Commits

Una vez validado el resultado en el navegador, le pedí a Claude Code que hiciera los commits con mensajes descriptivos siguiendo conventional commits.