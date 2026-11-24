# GUION — "SIN INTERNET. CON CONTROL."

**Producto:** Cejas & Café (foco: cafetería)
**Formato:** video publicitario generado con IA / Remotion
**Duración:** 60s · **Master:** 9:16 (1080×1920, 30fps)
**Cortes:** 15s hook · 30s · 16:9
**Público:** dueños de cafeterías
**Objetivo:** demo / descarga

---

## 1. Concepto

Un día en la cafetería, de la primera extracción al cierre. La cámara nunca sale del café. El giro narrativo: en la mitad del video **se cae el internet** y todo sigue funcionando. Ese es el héroe.

**Idea-fuerza:** _"Tu menú no necesita internet. Tu negocio sí necesita control."_

### Base real del producto (verificado en el código)

- El menú se sirve **desde el propio dispositivo** por WiFi local (`react-native-pocket-server`, puerto 8080). El HTML **no carga nada externo** (fuentes del sistema, logo embebido en base64, fotos servidas desde el teléfono). Funciona sin internet, solo con red local.
- Solo aparecen bebidas **activas**, con fotos, ingredientes y **filtro por ingredientes** en el navegador del cliente, sin instalar app.
- Resto del ecosistema café: receta con costo/ganancia/precio sugerido, Ventas (periodos + por producto), Almacén (bajo mínimo), Inversiones, Respaldos.

---

## 2. Sistema visual (tokens reales)

| Uso | Color |
|---|---|
| Fondo | `#FAF6EF` crema |
| Titulares / texto | `#2B211C` · `#4A3427` espresso |
| Acento precios | `#A47148` latte |
| Acento acción/vida | `#5A7A4C` bambú |
| Decorativo | `#8FA67C` hoja · `#D9B26E` ámbar |
| Ganancia | `#4C7A4C` |
| Superficies | `#FFFFFF` · `#FFFDF8` |

- **Tipografía:** Fraunces (titulares/números) + Outfit (UI y subtítulos).
- **Motion:** springs suaves, `easeOut` 150–250ms, press-scale 0.98.
- **Textura:** grano sutil, sombras cálidas `rgba(43,33,28,…)`, nunca negro puro.
- **Luz:** fría de mañana → cálida de tarde.

---

## 3. Beat sheet

| T | Plano | Visual / Acción | Texto en pantalla | Audio |
|---|---|---|---|---|
| **0–3s** | **HOOK** macro | Extracción de espresso en primerísimo plano. Un contador sube: **"120 CAFÉS HOY"**. Corte seco: el contador se borra y queda **"¿CUÁNTO GANASTE?"** parpadeando. | 120 CAFÉS HOY → ¿CUÁNTO GANASTE? | Golpe de bajo + *drip* de café. 200ms de silencio antes del golpe. |
| 3–8s | Caos documental | Mano con libreta de costos tachados; calculadora; un menú impreso con precio viejo y cinta; ticket arrugado. *Whip-pan* con blur entre objetos. | "PRECIO AL OJO." / "COSTOS EN LA LIBRETA." / "MENÚ DESACTUALIZADO." | Lápiz rayando, papel, riser corto. |
| **8–10s** | **REVEAL** | Negro 0.3s → el teléfono gira sobre la barra y enciende con el logo. Zoom-through al interior de la pantalla. | **"HASTA HOY."** | Silencio → *whoosh* → acorde. |
| 10–17s | App — **Bebidas / Receta** | Crear "Latte de bambú": se agregan ingredientes con stepper. El resumen vibra y recalcula: **Costo $18 → Ganancia 40% → Precio $30** (contador + pulso). | **"COSTO REAL. PRECIO JUSTO."** · sello **"EN SEGUNDOS."** | *Tick* por número + chime al fijar precio. |
| **17–20s** | App — **Menú** (parte 1) | Sube fotos de la bebida, la marca **Activa**, toca **"Iniciar menú"**. Aparece el QR con glow ámbar. | **"TU MENÚ, EN CADA MESA."** | *Beep* de inicio + música sube. |
| **20–23s** | **MONEY SHOT — OFFLINE** | Plano del router: se **desconecta el cable de internet** (LED ámbar→apagado). El cliente escanea el QR en su mesa. El menú **carga igual** en el navegador. Insignia **"SIN CONEXIÓN"** con ícono wifi-off. | **"SE CAYÓ EL INTERNET."** → **"EL MENÚ SIGUE."** | Corte de sonido: la música se apaga 1s. Solo ambiente. Luego vuelve. |
| 23–28s | Menú en el teléfono del cliente | El cliente filtra por ingredientes, toca un chip, se filtra la lista; abre el detalle y desliza el carrusel de fotos. Nada de "instalar". | **"SIN DESCARGAR NADA."** / **"SIN REIMPRIMIR."** / **"SOLO TU WIFI."** | Swipes y taps naturales. |
| 28–35s | App — **Ventas** | Dashboard: 4 celdas (Bebidas · Ventas · Producción · **Ganancia**) contando hacia arriba; la ganancia brilla verde. Cambia el periodo (Hoy → Semana) y se reordena. | **"CADA VENTA. CADA GASTO."** → **"CADA GANANCIA."** | Caja registradora suave en cada conteo. |
| 35–41s | Montaje 3 pantallas | **Almacén** (barra "Bajo mínimo" se llena) → **Inversiones** (invertido vs. ganancias) → **Respaldos** (exportar, check verde). 2s c/u al beat. | ALMACÉN · INVERSIONES · RESPALDO | 3 golpes secos. |
| 41–47s | Live-action cálido | Café lleno al atardecer. La dueña cierra la caja, mira el teléfono, sonríe, lo guarda. | **"TU CAFÉ, BAJO CONTROL."** | Música se abre, cálida. Ambiente real. |
| 47–53s | **DIFERENCIADOR** | Vuelta a pantalla limpia. Teléfono con las pestañas; íconos de "nube" y "servidor" se tachan. | **"SIN NUBE."** / **"SIN DEPENDER DE INTERNET."** / **"TUS DATOS SON TUYOS."** | Riser + impacto. |
| **53–60s** | **CTA** | Fondo crema. Logo + teléfono flotando. QR grande que **se dibuja módulo a módulo**. Línea de contacto. | **"PRUÉBALA HOY."** · `cejasycafe.app` (placeholder) | Impacto → silencio → _"Tu café, tu momento."_ |

---

## 4. Los 4 momentos a resaltar

1. **Recálculo de precio en vivo** (14s) — dolor #1 del cafetero.
2. **Se cae el internet y el menú sigue** (20–23s) — el diferenciador; el corte de audio lo hace memorable.
3. **Ganancia contando hacia arriba** (32s) — control emocional.
4. **"Tus datos son tuyos"** (50s) — cierra la venta frente a SaaS con nube.

---

## 5. Transiciones (mapeadas a Remotion)

| Transición | Dónde | Implementación |
|---|---|---|
| Corte seco al beat | 0–3s, 10s | `<Sequence>` sin overlap |
| Whip-pan + blur | 3–8s | `translateX` + `blur()` 4 frames |
| Zoom-through al teléfono | 8–10s | `scale 1→8`, `Easing.bezier(.7,0,.3,1)` |
| **Corte de audio a negro** | 20s | `<Sequence>` corta música + badge wifi-off |
| Match-cut QR | 17–20s | misma posición/escala del QR en host y cliente |
| Slide vertical | 28s | `<TransitionSeries.Slide direction="up">` |
| Radial wipe hoja | 35s | `clip-path: circle()` animado |
| Dibujo del QR | 53s | revelar módulos por índice con `interpolate` |

---

## 6. Notas técnicas para el build

- **Composiciones:** `AdVertical` 1080×1920/1800f · `AdSquare` · `AdHorizontal` · `Hook15` 450f.
- **Tokens compartidos:** importar `src/theme/tokens.ts` y `src/theme/typography.ts` directo en Remotion (consistencia 1:1).
- **Fuentes:** `@remotion/google-fonts/Fraunces` y `/Outfit`.
- **Pantallas reales:** capturas de Bebidas, Menú/QR, Ventas, Almacén, Inversiones, Respaldos → `<PhoneMockup>`.
- **B-roll IA:** espresso/leche/vapor, barra de café, cliente escaneando QR, local al atardecer (4–6 clips de 3s, luz cálida).
- **Safe zones:** 220px arriba / 320px abajo (Reels/TikTok).
- **Audio:** lo-fi/bossa 90 BPM; SFX taza, lápiz, scan, chime, caja.

---

## 7. Copys alternativos de hook

- "Vendiste 120 cafés hoy. ¿Sabes cuánto ganaste?"
- "Tu menú se cayó con el internet. Otra vez."
- "Deja de poner precios al ojo."
- "El menú que funciona aunque se caiga el WiFi."

---

## 8. Claim check (para no inventar)

- ✅ _"Sin internet"_ = **red WiFi local**, sin salida a internet. Decirlo así, no "sin WiFi".
- ✅ _"Sin instalar app"_ = se abre en el navegador.
- ✅ _"Solo bebidas activas"_, filtros por ingredientes, fotos, respaldo local.
- ❌ Evitar "sin mensualidades"/precios hasta confirmar modelo comercial.

---

## 9. Pendientes de decisión

- Master **9:16** y derivar 16:9 (o al revés).
- **CTA real** (link o WhatsApp) para fijar en el cierre.
- ¿Voz en off? Recomendado: femenina cálida, 3 líneas máximo.
