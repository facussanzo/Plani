# Plani

Organizador personal para gestionar tareas universitarias, laborales y objetivos personales.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (base de datos PostgreSQL en la nube)
- **@dnd-kit** (drag & drop)
- **date-fns** (manejo de fechas)
- **lucide-react** (iconos)

---

## Configuración paso a paso

### 1. Clonar / abrir el proyecto

Si descargaste la carpeta, abre la terminal en el directorio del proyecto:

```bash
cd "C:/Users/Z0058WUK/OneDrive - Siemens Energy/Desktop/Facundo/Plani"
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (elige cualquier nombre, ej: "plani").
3. Espera a que el proyecto se inicialice (~1-2 minutos).

### 4. Ejecutar el esquema SQL

1. En el panel de Supabase, ve a **SQL Editor** (icono de base de datos en la barra lateral).
2. Crea una nueva query.
3. Copia y pega el contenido del archivo `supabase/schema.sql` → **Run**.
4. Luego crea otra query con `supabase/schema_v2.sql` → **Run**.

Esto creará las tablas: `tasks`, `fixed_blocks`, `drafts`, `subjects` (materias).

### 5. Configurar variables de entorno

1. En Supabase, ve a **Settings → API**.
2. Copia:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** key
3. Abre el archivo `.env.local` en la raíz del proyecto y reemplaza los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 6. Ejecutar localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 7. Deploy en Vercel (opcional)

1. Instala Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Despliega:
   ```bash
   vercel
   ```

3. Configura las variables de entorno en el panel de Vercel:
   - Ve a tu proyecto → Settings → Environment Variables.
   - Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. O conecta tu repositorio de GitHub con Vercel para deploy automático.

---

## Funcionalidades

### Dashboard (`/`)
- Resumen del día actual con tareas completadas/pendientes
- Bloques fijos del día
- Tareas próximas (7 días)
- Estadísticas por área

### Calendario (`/calendar`)
- Vista mensual con indicadores de carga por día
- Drag & drop para mover tareas entre días
- Navegación entre meses
- Código de colores por tipo de tarea

### Vista de día (`/day/[fecha]`)
- Lista de tareas del día
- Bloques fijos del día
- Drag & drop para reordenar tareas
- Acciones rápidas: completar, editar, mover a mañana, eliminar

### Listas (`/lists`)
- Tabs Universidad / Trabajo
- Filtros por estado
- Ordenamiento por fecha límite, nombre o creación
- Agrupado por categoría
- Panel de detalle al hacer click

### Borrador (`/draft`)
- Captura rápida con Enter
- Convierte borradores en tareas con un click
- Sin fricción, ultra-rápido

### Bloques fijos (`/blocks`)
- Vista semanal visual
- Crear bloques recurrentes (clases, trabajo fijo, etc.)
- Selección de días de la semana

---

## Tipos de tarea

| Tipo | Color | Uso |
|------|-------|-----|
| Universidad | Azul | Trabajos, exámenes, lecturas |
| Trabajo | Ámbar | Tareas laborales |
| Objetivo | Púrpura | Metas con progreso |
| Recurrente | Verde | Hábitos y rutinas |

---

## Estructura del proyecto

```
plani/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout raíz con sidebar
│   ├── page.tsx            # Dashboard
│   ├── calendar/           # Calendario mensual
│   ├── day/[date]/         # Vista de día
│   ├── lists/              # Listas Universidad/Trabajo
│   ├── draft/              # Borrador rápido
│   └── blocks/             # Bloques fijos
├── components/
│   ├── dashboard/          # Componentes del dashboard
│   ├── calendar/           # Componentes del calendario
│   ├── day/                # Componentes de vista diaria
│   ├── lists/              # Componentes de listas
│   ├── draft/              # Componentes del borrador
│   ├── blocks/             # Componentes de bloques
│   ├── tasks/              # Modal, card y detalle de tareas
│   ├── ui/                 # Componentes UI reutilizables
│   └── layout/             # Sidebar
├── hooks/                  # Custom React hooks con Supabase
├── lib/                    # Tipos, cliente Supabase
└── supabase/               # Esquema SQL
```
