# Gastos Pareja

App (PWA) para llevar el control de gastos compartidos entre pareja, con
reparto **proporcional a los ingresos** de cada uno (no 50/50). Pensada para
usarse casi exclusivamente desde el celular, instalada como ícono en la
pantalla de inicio de dos iPhones, con sincronización en tiempo real entre
ambos.

## Stack

- **Frontend**: Next.js (App Router) + React + Tailwind CSS.
- **Backend**: Supabase (Postgres + API + Realtime).
- **Deploy**: Vercel.
- **PWA**: `app/manifest.ts` + service worker (`public/sw.js`) para
  instalarse desde Safari y funcionar a pantalla completa.

## Cómo funciona el reparto

Para cada mes:

1. `% de aporte de cada uno = su ingreso / (ingreso_lolo + ingreso_jaz)`
2. `Total compartido del mes = suma de movimientos con compartido = true`
3. `Le corresponde pagar = total compartido × su % de ingreso`
4. `Diferencia = lo que pagó realmente - lo que le correspondía`
5. Si la diferencia de Lolo es positiva, **Jaz le debe** esa plata a Lolo (y
   viceversa). Si ambas diferencias son ~0, "Están al día".

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
  compartidos) solo los ve quien los cargó — el otro no los ve en ninguna
  pantalla (dashboard, historial, gráfico por categoría), aunque sí se
  siguen sumando a los totales que corresponden a cada uno en "Mis
  gastos". Importante: esto es una privacidad "de uso normal" pensada para
  que cada uno no vea los gastos personales del otro navegando la app —
  no reemplaza un login real, ya que no hay contraseñas ni autenticación
  de por medio (ver más abajo).
- **Configuración**: selector de tema Claro / Oscuro / Automático (se
  guarda en el propio dispositivo) y acceso para cambiar de usuario.

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
   de este repo y hacé click en **Run**. Esto crea:
   - Las tablas `movimientos` e `ingresos`.
   - Los tipos `categoria_enum` y `persona_enum`.
   - Las políticas de Row Level Security (RLS) necesarias.
   - El alta de ambas tablas en la publicación `supabase_realtime`, para
     que los cambios se transmitan en vivo a los dos celulares.
5. Repetí el paso anterior con
   [`supabase/migrations/0002_categorias_y_presupuestos.sql`](./supabase/migrations/0002_categorias_y_presupuestos.sql)
   (en una query nueva, **después** de la 0001). Esto agrega:
   - Una tabla `categorias` (reemplaza el enum fijo: se puede agregar
     categorías nuevas desde la app) con las 12 categorías originales ya
     cargadas.
   - Una tabla `presupuestos` (límite mensual opcional por categoría).
   - Las políticas de RLS y el alta en `supabase_realtime` para ambas.
6. Si en algún momento agregás más migraciones, se van a guardar en la
   misma carpeta `supabase/migrations/` con el prefijo numérico siguiente
   (`0003_...`, `0004_...`), y se corren en orden, una por una.

### Sobre la seguridad (RLS)

Esta app **no usa el sistema de autenticación de Supabase** (no hace falta
un login "de verdad" para una app privada de dos personas). Las políticas
de RLS de la migración permiten leer/escribir a cualquiera que tenga la
`anon key` del proyecto. Por eso:

- No compartas ni publiques la URL/clave de tu proyecto de Supabase.
- El PIN opcional de la app (ver más abajo) es solo una traba liviana
  dentro de la interfaz, no un mecanismo de seguridad de la base de datos.

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

# Opcional: PIN de 4 dígitos que la app pide antes de elegir usuario.
# Dejalo vacío para no pedir PIN.
NEXT_PUBLIC_APP_PIN=1234
```

Corré el proyecto en modo desarrollo:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Vas a ver el selector
de usuario (Lolo / Jaz) y, si configuraste `NEXT_PUBLIC_APP_PIN`, primero
te va a pedir el PIN.

---

## 3. Desplegar en Vercel

1. Subí el repo a GitHub (si todavía no lo hiciste).
2. Entrá a [vercel.com](https://vercel.com) → **Add New** → **Project** →
   importá el repositorio de GitHub.
3. En **Environment Variables**, agregá las mismas tres variables del
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_PIN` (opcional)
4. Hacé click en **Deploy**. Vercel detecta automáticamente que es un
   proyecto Next.js.
5. Una vez desplegado, vas a tener una URL tipo
   `https://gastos-pareja.vercel.app`. Esa es la URL que van a abrir Lolo
   y Jaz desde sus iPhones.

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
  login/              → selector de usuario + PIN opcional
  (tabs)/             → pantallas con navegación inferior
    page.tsx           → dashboard
    historial/         → historial con filtros
    ingresos/          → Finanzas: ingresos (% de reparto) y presupuestos
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
