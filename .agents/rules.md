# Coding Rules — Psicarte

## Base de datos

- Usar SQLite con `better-sqlite3` (síncrono, sin ORM, SQL directo)
- `src/db/connection.ts` — singleton que abre/cierra la BD
- `src/db/schema.ts` — solo CREATE TABLE / migraciones. Ejecutable con `tsx`
- `src/db/seed.ts` — datos iniciales de prueba. Ejecutable con `tsx`
- Todo seed debe ejecutarse dentro de una transacción
- `snake_case` en columnas SQL, `camelCase` en TypeScript (mapeo manual)
- La ruta de la BD se toma de `DB_PATH` (variable de entorno) o `psicarte.db` por defecto

## TypeScript

- `strict: true` — tipos explícitos en toda función, prohibido `any`
- Prohibido `as` casts forzados; preferir type guards o tipos bien definidos
- Preferir `type` sobre `interface` para formas de datos
- Nombres en `PascalCase` para tipos, `camelCase` para todo lo demás
- Archivos con nombre en `kebab-case.ts`

## Estructura del proyecto

```
src/
  db/       → capa de datos (connection, schema, seed, queries)
  server/   → Express (routes, middleware)
  ...resto  → frontend React
```

- `db/` debe ser autocontenida: importable desde otros módulos y ejecutable como CLI
- Las queries de base de datos van en su propio archivo dentro de `db/` (ej. `contacts.ts`)

## Estilo de código

- Sin comentarios en código a menos que expliquen un "por qué" no obvio
- Usar `function` en lugar de arrow functions para exports principales
- Preferir early returns sobre if/else anidados
- Consistencia con el formateador del proyecto (Prettier por defecto)

## Git / Commits

- Commits en español, imperativo, cortos: "Agrega validación de email"
- No commitear archivos generados, `.env`, `node_modules/`, `*.db`
- Usar `enlist` cada vez que se crea o modifica un archivo

## Pruebas

- No dejar procesos corriendo en segundo plano al hacer pruebas
- Limpiar siempre los procesos (node, servidores) al terminar una prueba

---

# Identidad Visual — Centro Integral Psicarte

## Variables CSS globales

```css
:root {
  --color-primary: #8B1E4F;
  --color-primary-dark: #651337;
  --color-primary-light: #B23A6D;

  --color-secondary: #0F2747;
  --color-secondary-light: #274A73;

  --color-gold: #C89A4B;
  --color-gold-dark: #A87524;
  --color-gold-light: #E0BE78;

  --color-background: #FAF8F5;
  --color-background-alt: #F2ECE7;

  --color-text: #1F2430;
  --color-text-secondary: #5F6472;

  --color-card: #FFFFFF;
}
```

## Paleta de colores

| Uso | HEX |
|---|---|
| Borgoña (primario) | `#8B1E4F` |
| Borgoña oscuro (hover) | `#651337` |
| Borgoña claro | `#B23A6D` |
| Azul profundo (secundario) | `#0F2747` |
| Azul medio (links) | `#274A73` |
| Dorado (acento premium) | `#C89A4B` |
| Dorado oscuro (bordes) | `#A87524` |
| Dorado claro (hover) | `#E0BE78` |
| Marfil (fondo ppal) | `#FAF8F5` |
| Fondo alterno | `#F2ECE7` |
| Gris claro (tarjetas) | `#F5F4F2` |
| Texto principal | `#1F2430` |
| Texto secundario | `#5F6472` |

## Tipografía

- **Títulos:** `'Cormorant Garamond', serif`
- **Cuerpo:** `'Montserrat', sans-serif`

## Jerarquía tipográfica

| Elemento | Font-size | Weight | Color |
|---|---|---|---|
| H1 | 60px | 700 | `#0F2747` |
| H2 | 36px | 600 | `#8B1E4F` |
| H3 | 28px | 600 | `#0F2747` |
| Body | 18px | 400 | `#5F6472` (line-height: 1.7) |

## Navbar

- Fondo: `#FFFFFF` o `rgba(255,255,255,0.95)` con `backdrop-filter: blur(10px)`
- Borde inferior: `2px solid #C89A4B`
- Links: normal `#0F2747` → hover `#8B1E4F` → activo `#C89A4B`

## Botones

- **Primario (CTA):** bg `#8B1E4F`, hover `#651337`, sombra `0 8px 25px rgba(139,30,79,.25)`
- **Secundario:** bg `#0F2747`, hover `#18375E`
- **Premium:** bg `#C89A4B`, hover `#A87524`
- Todos: texto blanco

## Tarjetas

```css
background: #FFFFFF;
border-top: 4px solid #C89A4B;
border-radius: 12px;
box-shadow: 0 10px 30px rgba(15,39,71,.08);
hover: translateY(-5px) con transition all .3s ease;
```

## Footer

- Fondo: `#0F2747`, texto blanco
- Links: `#C89A4B` → hover `#E0BE78`

## Formularios

- Borde: `1px solid #D6D6D6`
- Focus: `border-color: #8B1E4F` + `box-shadow: 0 0 0 3px rgba(139,30,79,.15)`
- Placeholder: `#9C9C9C`

## Gradientes

- **Hero:** `linear-gradient(135deg, #0F2747 0%, #8B1E4F 100%)`
- **Premium:** `linear-gradient(135deg, #C89A4B 0%, #E0BE78 100%)`

## Regla 60-30-10

- 60% fondo `#FAF8F5`
- 30% profesional `#0F2747`
- 10% énfasis `#8B1E4F` / `#C89A4B`

## Principios visuales

- Espacios amplios y limpios
- Mucho blanco marfil
- Azul profundo para confianza
- Borgoña para emoción y arte
- Dorado solo para detalles premium
- Animaciones suaves
- Diseño minimalista con sensación institucional-artística
