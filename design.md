# Design System — Cejas & Café

> **Nombre de trabajo:** Bambú & Brew
> **Aplicación:** gestión de ventas local para una cafetería que por el día funciona como salón de cejas y por la tarde se transforma en cafetería.
> **Stack:** React Native · Expo SDK 54 · expo-sqlite · TypeScript.
> **Uso:** este documento es la única fuente de verdad visual. Todo componente, pantalla y token debe derivarse de aquí.

---

## 1. Identidad de marca

### 1.1 Concepto

Un mismo local, dos vidas: **por la mañana** se hacen cejas; **por la tarde** se sirve café. La identidad visual une ambas caras en un **tema único de bambú natural**: el bambú como motivo estructural (líneas verticales, segmentos, hojas) que evoca frescura, calma y crecimiento — y el marrón de café como tierra cálida que da raíz a todo.

La "transformación" no se expresa como dos temas de UI separados, sino como **historia de marca** y como motivo narrativo en copy y estados vacíos: mañana (fresco, ligero) → tarde (cálido, acogedor).

### 1.2 Valores

- **Natural:** verdes orgánicos, texturas vegetales, cero brillos artificiales.
- **Cálido:** marrones profundos, sombras cálidas, nunca gris duro.
- **Cercano:** tipografía amable, micro-interacciones suaves, tono de voz conversacional.
- **Preciso:** es una app de negocio; números, costos y precios siempre claros y legibles.

### 1.3 Guiño al lado belleza

Motivo decorativo sutil: una **línea de arco fino** (estilización de ceja) usada con moderación — como divisor decorativo, bajo el wordmark y en empty states — siempre combinada con hojas de bambú. Nunca compite con el mensaje principal; es un guiño, no un protagonista.

### 1.4 Tono de voz

Español, cercano y claro. Ejemplos de copy:

- Empty state bebidas: *"Aún no hay bebidas. El bambú crece con paciencia: añade tu primera receta."*
- Confirmar eliminar: *"¿Eliminar esta bebida? Esta acción no se puede deshacer."*
- Calculadora de precio: *"Precio sugerido (redondeado al 10 más cercano): $120"*

---

## 2. Paleta y tokens de color

Tema **unificado** (sin variante oscura). Solo modo claro.

### 2.1 Colores de marca

| Rol | Nombre del token | Hex | Uso |
|---|---|---|---|
| Primario | `brand.primary` | `#4A3427` | Botones principales, tab activa, encabezados, toggles activos |
| Secundario | `brand.secondary` | `#A47148` | Botones secundarios, enlaces, precios destacados |
| Latte | `brand.latte` | `#C89F7B` | Fondos de badges, superficies realzadas suaves |
| Acento bambú | `brand.accent` | `#5A7A4C` | Iconos, acentos decorativos, selección, links |
| Hoja | `brand.leaf` | `#8FA67C` | Decoración, iconografía decorativa, fondos de empty states |
| Ámbar tallo | `brand.amber` | `#D9B26E` | Detalles decorativos, divisores, motivos bambú |

### 2.2 Semánticos

| Token | Hex | Uso |
|---|---|---|
| `bg.background` | `#FAF6EF` | Fondo general (crema cálida) |
| `bg.surface` | `#FFFFFF` | Tarjetas, inputs, modales |
| `bg.surfaceElevated` | `#FFFDF8` | Popovers, menús, resultados flotantes |
| `bg.subtle` | `#F5EDE3` | Filas alternadas, hover, zonas agrupadas |
| `border.default` | `#E8DCCB` | Bordes de inputs, separadores |
| `text.primary` | `#2B211C` | Texto principal |
| `text.secondary` | `#6B5A50` | Texto secundario, descripciones |
| `text.muted` | `#9C8B7D` | Texto deshabilitado, placeholders |
| `text.onBrand` | `#FDF8F0` | Texto sobre primario (botones) |
| `success` | `#4C7A4C` | Activo, ganancia, estado OK |
| `warning` | `#C98A2D` | Avisos, stock bajo |
| `error` | `#B0563F` | Errores, eliminar |
| `shadow` | `rgba(43,33,28,0.12)` | Sombras (siempre tono cálido) |
| `overlay` | `rgba(43,33,28,0.45)` | Capa de modales |

### 2.3 Reglas de uso

- **Regla 60/30/10:** 60% crema/neutros, 30% marrones, 10% verde bambú.
- El **verde bambú** es acento: iconos, selección, decorativos. Nunca como fondo de botón primario.
- **Contraste AA obligatorio:** `text.primary`/`text.secondary` sobre `bg.surface` y `bg.background`; `text.onBrand` sobre `brand.primary`; el verde `brand.accent` solo como icono/decoración, nunca como texto pequeño.
- Errores/éxitos siempre con tono cálido (nunca verdes/rojos fríos saturados).

---

## 3. Tipografía

Fuentes cargadas con `expo-font` + `@expo-google-fonts`:

- **Fraunces** — títulos y números destacados (carácter editorial de cafetería artesanal).
- **Outfit** — cuerpo, UI, inputs, etiquetas.

### 3.1 Familias y pesos

| Rol | Fuente | Pesos |
|---|---|---|
| Display / títulos | Fraunces | 500, 600 |
| Cuerpo / UI | Outfit | 400, 500, 600 |

### 3.2 Escala tipográfica

| Token | Tamaño | Interlineado | Uso |
|---|---|---|---|
| `type.display` | 34 | 38 | Titulares de pantalla |
| `type.title` | 24 | 28 | Títulos de sección |
| `type.headline` | 20 | 26 | Títulos de tarjeta |
| `type.body` | 16 | 24 | Texto base |
| `type.small` | 14 | 20 | Texto secundario |
| `type.caption` | 12 | 16 | Etiquetas, badges |
| `type.micro` | 10 | 14 | Metadata |

### 3.3 Reglas

- **Precios y montos:** cifras tabulares (`fontVariant: ['tabular-nums']`) siempre.
- Los **precios grandes** usan Fraunces 600; los costos secundarios, Outfit 400 en `text.secondary`.
- Máximo 2 pesos tipográficos por pantalla. Los títulos no superan 2 líneas.

---

## 4. Espaciado, radios y sombras

### 4.1 Escala de espaciado (base 4)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

Tokens: `space.xs` (4), `space.sm` (8), `space.md` (12), `space.lg` (16), `space.xl` (20), `space.2xl` (24), `space.3xl` (32), `space.4xl` (40), `space.5xl` (48), `space.6xl` (64).

- Márgenes laterales de pantalla: `space.lg` (16). Gutter entre tarjetas: `space.lg`.
- Espaciado vertical entre secciones: `space.3xl` (32).

### 4.2 Radios (orgánicos, suaves)

| Token | Valor | Uso |
|---|---|---|
| `radius.sm` | 8 | Inputs, badges |
| `radius.md` | 12 | Botones |
| `radius.lg` | 16 | Tarjetas |
| `radius.xl` | 20 | Modales, superficies grandes |
| `radius.pill` | 999 | Chips, toggles |

### 4.3 Sombras

Una sola sombra base, tono cálido:

- `shadow.sm`: `rgba(43,33,28,0.08)` · offset `0,1` · radio `4`
- `shadow.md`: `rgba(43,33,28,0.12)` · offset `0,2` · radio `12`

Prohibido usar negro puro o sombras grises.

---

## 5. Iconografía

- Fuente: `@expo/vector-icons` — **Feather** (trazo fino, acorde a lo natural). Fallback **MaterialCommunityIcons** para iconos de café específicos.
- Trazo consistente: 1.5–2px. Tamaño base 20, mínimo 16, máximo 28.
- Color por defecto `text.secondary`; en acciones activas `brand.primary`; acentos decorativos `brand.accent`.

**Iconos principales de la app:**
- Bebidas: `coffee` / `cup` (MaterialCommunityIcons: `coffee-outline`)
- Ingredientes: `package` (Feather) o `sprout` (MCI)
- Ventas: `trending-up` (Feather)
- Ganancias: `percent` / `bar-chart-2` (Feather)
- Ajustes: `settings` (Feather)
- Añadir: `plus` (Feather) · Eliminar: `trash-2` · Editar: `edit-2` · Cerrar: `x`

**Motivos decorativos (en SVG/vectores):** hoja de bambú, segmentos de tallo verticales, línea de arco (guiño a cejas).

---

## 6. Componentes UI

Biblioteca en `src/ui/`. Todos con soporte de tema vía tokens.

### 6.1 Botón (`Button`)
- **Primario:** fondo `brand.primary`, texto `text.onBrand`, radio `md`. Variantes: `primary`, `secondary` (borde `border.default`, texto `brand.primary`), `ghost`, `danger`.
- Altura mínima 48 (objetivo táctil). Estados: `pressed` oscurece 8%; `disabled` opacidad 0.4.
- Ícono opcional a la izquierda (`plus`, `trash-2`, etc.).

### 6.2 Tarjeta (`Card`)
- Fondo `bg.surface`, radio `lg`, sombra `md` (o elevación sutil), padding `lg`.
- Variantes: **Bebida** (nombre Fraunces headline, PriceTag, costo y ganancia secundarios, badge activo, menú editar/eliminar) e **Ingrediente** (nombre, unidad, precio unitario, cantidad de uso).

### 6.3 Input (`Input`)
- Fondo `bg.surface`, borde `border.default` (radio `sm`), focus borde `brand.accent`.
- Placeholder `text.muted`. Etiqueta `type.small` + `text.secondary`. Mensaje de error en `error`.
- Teclados: `decimal-pad` para cantidades/precios; `default` para nombres.

### 6.4 Badge (`Badge`)
- Chips con fondo `bg.subtle` y texto `caption` semibold.
- Estados: `activo` (verde `success`), `inactivo` (muted), `sugerido`/`info`.

### 6.5 Stepper (`Stepper`)
- Control − / + para cantidades de ingredientes. Botones 40×40, radio `pill`, valor central con cifras tabulares.

### 6.6 PriceTag (`PriceTag`)
- Muestra precio redondeado a múltiplo de 10. Precio en Fraunces 600 `brand.secondary`; debajo, costo + ganancia en `type.small`.

### 6.7 EmptyState (`EmptyState`)
- Ilustración de bambú (hojas + arco de ceja), título Fraunces, texto secundario, CTA opcional.

### 6.8 TabBar (`TabBar`)
- 5 pestañas: **Inicio · Bebidas · Ingredientes · Ventas · Ajustes**. Ícono + label `caption`.
- Activa: `brand.primary` + indicador de hoja bambú; inactiva: `text.muted`.

### 6.9 Modal (`Modal`)
- Overlay `rgba(43,33,28,0.45)`, tarjeta radio `xl`, barra de arrastre `border.default`. Confirmaciones con botón `danger` / `primary`.

### 6.10 ScreenHeader
- Título Fraunces `type.title` + subtítulo `text.secondary` + acción `+` a la derecha.

---

## 7. Pantallas

### 7.1 Bebidas (lista)
- `ScreenHeader` "Bebidas". Fila de cards de bebida: nombre, `PriceTag`, badge activo, menú ⋯ (editar/eliminar). Búsqueda + filtro activas/inactivas.

### 7.2 Detalle / Receta (editor)
- Encabezado con nombre editable + badge de estado.
- **Resumen en vivo:** Card fija mostrando `calcularResumenBebida` → costo producción, % ganancia, precio sugerido (redondeado al 10 superior).
- **Editor de receta:** lista de ingredientes (Stepper por cantidad, precio unitario, subtotal por línea), botón "añadir ingrediente".
- **Configuración:** % ganancia (input numérico o slider) → recalcula precio en vivo.

### 7.3 Ingredientes (lista + formulario)
- Lista de ingredientes (nombre, unidad, precio unitario).
- Formulario: nombre (texto), unidad (texto libre), precio unitario (`decimal-pad`). Validación: nombre y precio > 0 obligatorios.

### 7.4 Ventas (futura)
- Registro de ventas diarias, totales por día, listado histórico.

### 7.5 Ganancias / Inicio (futura)
- Resumen: ventas del día, costo total, ganancia bruta/neta. Cards con `PriceTag` grande.

### 7.6 Ajustes
- Preferencias, exportación/respaldo de BD, tema (reservado para futuro).

---

## 8. Motion

- **Transiciones:** 150–200ms `easeOut`. Nunca más de 250ms para UI.
- **Tarjetas y listas:** entrada con `opacity` + `translateY(8px)`; reorden animado.
- **Cambio de valor en vivo** (costo/precio): animación breve de escala/cambio de dígito en el resumen.
- **TabBar:** indicador activo se desliza con spring suave (tension 300, friction 30).
- **Presionar:** escala 0.98 en botones/tarjetas.
- Respetar `Reduce Motion` del sistema.

---

## 9. Accesibilidad y buenas prácticas

- **Objetivos táctiles ≥ 48×48.**
- **Contraste AA** en todo texto (ver regla 2.3). `accessibilityLabel` en iconos decorativos con `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"`.
- Estados visibles de focus/focus trap en modales.
- `keyboardShouldPersistTaps="handled"` en listas con inputs.
- Sin emojis como sustitutos de iconos funcionales.

---

## 10. Arquitectura de código

```
src/theme/
  tokens.ts        # colores, espaciado, radios, sombras, escala tipográfica
  typography.ts    # presets de estilo por rol (type.display, type.body, ...)
  ThemeContext.tsx # provider + useTheme(), paleta semántica resuelta
src/ui/
  Button.tsx  Card.tsx  Input.tsx  Badge.tsx  Stepper.tsx
  PriceTag.tsx  EmptyState.tsx  TabBar.tsx  Modal.tsx  ScreenHeader.tsx
src/components/screens/   # BebidasScreen, BebidaDetailScreen, IngredientesScreen, ...
```

- Los componentes de `src/ui/` **solo consumen tokens**, nunca valores hardcodeados.
- `PriceTag` y el editor de receta usan directamente `src/domain/calculos.ts` (`calcularResumenBebida`, `redondearDinero`).
- Todo texto visible centralizado (o al menos en constantes por pantalla) para mantener el tono de voz.
