# Gastos Pareja

App (PWA) para llevar el control de gastos compartidos entre pareja (o de
una sola persona), con reparto **proporcional a los ingresos** de cada uno
(no 50/50). Cada usuario crea su cuenta real (email + contraseña) y
pertenece a un **hogar** propio y privado: sus datos nunca se mezclan con
los de otro hogar. Pensada para usarse casi exclusivamente desde el
celular, instalada como ícono en la pantalla de inicio del iPhone, con
sincronización en tiempo real entre los integrantes de un mismo hogar.

## Stack

- **Frontend**: Next.js (App Router) + React + Tailwind CSS.
- **Backend**: Supabase (Postgres + Auth + Realtime).
- **Deploy**: Vercel.
- **PWA**: `app/manifest.ts` + service worker (`public/sw.js`) para
  instalarse desde Safari y funcionar a pantalla completa.

## Hogares y cuentas

- Al registrarte (email + contraseña) armás tu **hogar**: elegís si vas a
  usar la app solo/a (capacidad 1) o para compartir con alguien más
  (capacidad 2, por ahora el máximo).
- Si elegiste compartir, la app te da un **código de invitación** (ej.
  `K7QM-3XPZ`). Se lo pasás a esa persona y ella lo usa en "Unirme con un
  código" para sumarse a tu mismo hogar.
- Cada hogar es completamente independiente: sus movimientos, ingresos,
  categorías y presupuestos no se comparten ni se ven desde otro hogar
  (reforzado con Row Level Security en la base de datos, no es solo un
  filtro de la interfaz).

## Cómo funciona el reparto

Para cada mes, y por cada persona del hogar:

1. `% de aporte = su ingreso / (suma de los ingresos de todo el hogar)`
2. `Total compartido del mes = suma de movimientos con compartido = true`
3. `Le corresponde pagar = total compartido × su % de aporte`
4. `Diferencia = lo que pagó realmente - lo que le correspondía`
5. Si hay dos personas y una tiene diferencia positiva, la otra **le
   debe** esa plata. Si ambas diferencias son ~0, "Están al día". Con una
   sola persona en el hogar no hay reparto ni deuda: solo se llevan sus
   propios gastos.

Esta lógica vive en `lib/calculos.ts`.

## Funcionalidad

- **Dashboard**: balance del mes, total gastado, "Mis gastos" (lo personal
  de quien está usando el teléfono + su parte proporcional de lo
  compartido) y gasto por categoría.
- **Categorías dinámicas**: además de las 12 categorías iniciales, se
  pueden agregar categorías nuevas (con ícono) desde el mismo formulario
  de carga, tocando "+ Nueva". Quedan disponibles al instante para los dos
  celulares.
- **Presupuestos**: en la pestaña "Finanzas" → "Presupuestos" se puede
  definir un límite mensual por categoría. Si el gasto real lo supera, la
  barra se pone en rojo (en esa pantalla y en el dashboard).
- **Historial** filtrable por mes, categoría y quién pagó. Tocar un
  movimiento lo abre para editarlo; el ícono 🗑️ lo borra.
- **Privacidad entre los dos**: los gastos marcados como personales (no
  compartidos) solo los ve quien los cargó — el otro integrante del hogar
  no los ve en ninguna pantalla (dashboard, historial, gráfico por
  categoría), aunque sí se siguen sumando a los totales que corresponden a
  cada uno en "Mis gastos". Esto está reforzado a nivel de base de datos
  (RLS): las filas de gastos personales del otro ni siquiera llegan al
  celular.
- **Configuración**: selector de tema Claro / Oscuro / Automático (se
  guarda en el propio dispositivo), datos de tu hogar (integrantes, código
  de invitación) y cierre de sesión.

---

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta (es
   gratis) y hacé click en **New project**.
2. Elegí un nombre (ej. `gastos-pareja`), una contraseña para la base de
   datos y una región cercana. Esperá a que termine de aprovisionarse
   (1-2 minutos).
3. Andá a **SQL Editor** (ícono de la izquierda) → **New query**.
4. Copiá y pegá todo el contenido del archivo
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
   de este repo y hacé click en **Run**. Esto crea las tablas base
   (`movimientos`, `ingresos`) y las políticas de RLS iniciales.
5. Repetí el paso anterior con
   [`supabase/migrations/0002_categorias_y_presupuestos.sql`](./supabase/migrations/0002_categorias_y_presupuestos.sql)
   (en una query nueva, **después** de la 0001). Esto agrega:
   - Una tabla `categorias` (reemplaza el enum fijo: se puede agregar
     categorías nuevas desde la app) con las 12 categorías originales ya
     cargadas.
   - Una tabla `presupuestos` (límite mensual opcional por categoría).
6. Repetí el paso una vez más con
   [`supabase/migrations/0003_hogares_y_cuentas_reales.sql`](./supabase/migrations/0003_hogares_y_cuentas_reales.sql)
   (en una query nueva, **después** de la 0002). Esto agrega el modelo de
   cuentas reales:
   - Tablas `hogares` y `perfiles` (una fila de `perfiles` por cada cuenta
     de Supabase Auth, ligada a un hogar).
   - Las funciones `crear_hogar` / `unirse_a_hogar`, únicas formas de
     crear un hogar o sumarte a uno (validan el código de invitación
     server-side, nunca queda expuesto).
   - `hogar_id` en `movimientos` / `categorias` / `presupuestos`, y
     `ingresos` pasa a ser una fila por persona y por mes.
   - Las políticas de RLS que aíslan cada hogar del resto y ocultan los
     gastos personales del otro integrante.
   - El alta de las tablas nuevas en `supabase_realtime`.
7. En **Authentication** → **Providers**, confirmá que **Email** esté
   habilitado (viene así por defecto). Dejá la confirmación por email
   activada: cuando alguien se registra, Supabase le manda un link antes
   de poder iniciar sesión.
8. Si en algún momento agregás más migraciones, se van a guardar en la
   misma carpeta `supabase/migrations/` con el prefijo numérico siguiente
   (`0004_...`), y se corren en orden, una por una.

### Sobre la seguridad (RLS + Auth)

Esta app usa el sistema de autenticación real de Supabase (email +
contraseña). El acceso a los datos no depende de la `anon key` sino de
quién esté logueado: las políticas de RLS de la migración `0003` hacen que
cada fila solo se pueda leer o escribir si pertenecés al hogar dueño de esa
fila, y los gastos personales del otro integrante ni siquiera se pueden
leer aunque estés en el mismo hogar. Igual que con cualquier proyecto de
Supabase, no compartas ni publiques la URL/clave de tu proyecto.

### Obtener las API keys

1. En Supabase, andá a **Project Settings** (ícono de engranaje) → **API**.
2. Copiá:
   - **Project URL** → va en `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public key** → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 2. Configurar el proyecto localmente

```bash
git clone <url-de-tu-repo>
cd gastos-pareja
npm install
cp .env.example .env.local
```

Editá `.env.local` con los valores de tu proyecto de Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-public
```

Corré el proyecto en modo desarrollo:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Vas a ver la pantalla
de inicio de sesión; tocá "Registrate" para crear tu cuenta, confirmá el
email que te llega, iniciá sesión y elegí si tu hogar es solo tuyo o para
compartir.

---

## 3. Desplegar en Vercel

1. Subí el repo a GitHub (si todavía no lo hiciste).
2. Entrá a [vercel.com](https://vercel.com) → **Add New** → **Project** →
   importá el repositorio de GitHub.
3. En **Environment Variables**, agregá las mismas dos variables del
   `.env.local` (como tipo **Config**, no Secret, ya que son
   `NEXT_PUBLIC_*` y el navegador las necesita):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Hacé click en **Deploy**. Vercel detecta automáticamente que es un
   proyecto Next.js.
5. Una vez desplegado, vas a tener una URL tipo
   `https://gastos-pareja.vercel.app`. Esa es la URL que van a abrir todos
   los que se registren, cada uno desde su iPhone.

Cada vez que hagas push a la rama principal, Vercel vuelve a desplegar
automáticamente.

---

## 4. Agregar la app a la pantalla de inicio del iPhone

1. Abrí la URL de la app (la de Vercel) en **Safari** en el iPhone —
   tiene que ser Safari, no Chrome ni otro navegador.
2. Tocá el ícono de **Compartir** (el cuadrado con la flecha hacia
   arriba), en la barra inferior.
3. Deslizá hacia abajo en el menú y elegí **"Agregar a inicio"** /
   **"Add to Home Screen"**.
4. Confirmá el nombre ("Gastos Pareja") y tocá **Agregar**.
5. Repetí los mismos pasos en el otro iPhone.

A partir de ahí, el ícono abre la app a pantalla completa, sin la barra de
Safari, como si fuera una app nativa instalada.

---

## 5. Sincronización en tiempo real

Cuando alguien carga, edita o borra un gasto (o actualiza los ingresos del
mes), Supabase Realtime avisa a los demás dispositivos conectados y el
dashboard se actualiza solo, sin recargar la página. Como respaldo (por si
el celular estuvo un rato en segundo plano y la conexión en tiempo real se
cortó), la app también refresca los datos cada 20 segundos.

---

## Estructura del proyecto

```
app/
  login/              → iniciar sesión (email + contraseña)
  registro/           → crear cuenta
  onboarding/         → crear hogar (solo/compartido) o unirse con código
  (tabs)/             → pantallas con navegación inferior
    page.tsx           → dashboard
    historial/         → historial con filtros
    ingresos/          → Finanzas: ingresos (% de reparto) y presupuestos
    configuracion/      → tema, datos del hogar, cerrar sesión
  nuevo/               → formulario de carga rápida (alta y edición)
  manifest.ts          → manifest de la PWA
components/            → componentes de UI reutilizables
lib/                    → tipos, cálculos, hooks de datos/realtime, Supabase
supabase/migrations/    → esquema SQL de la base de datos
public/
  icons/                → íconos de la PWA (incluye apple-touch-icon)
  sw.js                 → service worker (cachea el app shell)
```

## Scripts

```bash
npm run dev     # desarrollo local
npm run build   # build de producción
npm run start   # levantar el build de producción
npm run lint    # linter
```
