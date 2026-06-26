# Phase 1: Foundation - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a version of the existing game that works correctly on any device — zero known bugs, expanded keyboard controls, the correct 2026 F1 driver grid (21 rivals + Colapinto as player), and a responsive layout that navigates cleanly on phones. No new gameplay features. No visual redesign (that's Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Grilla 2026 — datos de la grilla

- **D-01:** La grilla 2026 tiene **22 pilotos en 11 equipos** (Cadillac es el equipo nuevo). El player es Franco Colapinto (Alpine #43), por lo tanto `RIVALS` = **21 entradas** (todos excepto Colapinto). El array pasa de 20 a 21 entradas.

- **D-02:** Grilla 2026 completa confirmada:

  | Equipo | Piloto 1 | Piloto 2 |
  |--------|----------|----------|
  | McLaren | Lando Norris | Oscar Piastri |
  | Ferrari | Charles Leclerc | Lewis Hamilton |
  | Mercedes | George Russell | Kimi Antonelli |
  | Red Bull | Max Verstappen | Isack Hadjar |
  | Williams | Carlos Sainz | Alex Albon |
  | Aston Martin | Fernando Alonso | Lance Stroll |
  | Alpine | Pierre Gasly | **Colapinto = player** |
  | Haas | Esteban Ocon | Oliver Bearman |
  | Audi | Gabriel Bortoleto | Nico Hülkenberg |
  | Racing Bulls | Liam Lawson | Arvid Lindblad |
  | Cadillac | Valtteri Bottas | Sergio Pérez |

- **D-03:** Números de auto y colores de librea exactos: el agente DEBE verificarlos en `https://www.formula1.com/en/drivers` durante la implementación (Cadillac en particular no tiene colores históricos en el juego).

- **D-04:** Valores de `skill` (0.79–0.96): asignar basado en rendimiento 2026. Sugerencia: top tier (0.92–0.96) = Verstappen, Norris, Leclerc, Hamilton, Piastri; mid tier (0.86–0.91) = Russell, Antonelli, Sainz, Alonso, Gasly, Lawson; lower tier (0.79–0.85) = Albon, Stroll, Ocon, Bearman, Bortoleto, Hülkenberg, Hadjar, Bottas, Pérez, Lindblad.

- **D-05:** `localStorage` keys `cr_rival_<idx>` se extienden de `cr_rival_<0-19>` a `cr_rival_<0-20>` (21 rivales). No hay migración necesaria — datos de rivales anteriores simplemente quedan huérfanos.

### Controles — hallazgo de código

- **D-06:** ArrowLeft, ArrowRight, ArrowDown + A, D, S **ya están mapeados** en `game.js:1054-1062`. CTRL-01 y CTRL-02 están esencialmente implementados. Solo falta **Spacebar como freno** (CTRL-03). Agregar a los listeners `keydown`/`keyup`: `if (e.key === ' ') keys.down = true/false`.

- **D-07:** ArrowUp y W (aceleración) NO son necesarios — el juego usa `AUTO_ACCEL` constante, no hay aceleración manual.

### UI responsive y mobile

- **D-08 (Claude's discretion):** `devicePixelRatio`: implementar como **escala estática al init** — `canvas.width = 480 * dpr`, `canvas.height = 640 * dpr`, `ctx.scale(dpr, dpr)` en el momento en que se crea el canvas. No se necesita listener de resize dinámico para esta fase.

- **D-09 (Claude's discretion):** Mobile rival select carousel (< 500px): implementar con **botones prev/next** (más accesible que swipe-only). Mostrar 1 rival a la vez con tarjeta grande. Swipe gesture es mejora opcional pero no bloqueante.

- **D-10:** Phase 1 NO toca el diseño visual de las pantallas (tipografía, colores, animaciones). Eso es UI-07 en Phase 3. Phase 1 solo arregla layout, bugs y funcionalidad.

### Bug fixes — ubicaciones exactas

- **D-11 (BUG-01):** Eliminar el `resetGame()` en línea ~1212 de `game.js` (dentro del handler de `btn-restart` para el host en modo solo). `beginCountdown()` ya llama `resetGame()` internamente.

- **D-12 (BUG-02):** En el handler de mensaje `'finish'` en `onMsg` (`game.js:~992-996`), agregar guard: `if (remote.lap < TOTAL_LAPS - 1) return;` antes de declarar al ganador.

- **D-13 (BUG-03):** En `updateHUD()`, la lambda `cpScore` se define dos veces (líneas 673 y 682). Consolidar en una única definición al inicio de la función.

- **D-14 (BUG-04):** `lapStartTime` debe inicializarse a `performance.now()` cuando arranca la carrera (en `beginCountdown()` o al comienzo de `phase === 'racing'`), no al primer cruce de CP0. Esto permite medir la vuelta 1 correctamente.

### Multiplayer UX

- **D-15 (UI-05):** Botón "Copiar código": usar `navigator.clipboard.writeText(roomCode)`. Toast "¡Copiado!" como elemento div con `opacity` transition de 1.5s, no un `alert()`.

- **D-16 (UI-06):** Modal de desconexión: crear un div overlay con z-index alto, mensaje "El rival se desconectó. Volviendo al menú...", y `setTimeout(() => goTo('lobby'), 3000)`. Reemplaza completamente el `alert()` en `onDisconnect()` (`game.js:1006-1011`).

### Claude's Discretion

- DPR: escala estática al init (sin listener de resize)
- Carousel mobile: botones prev/next (sin swipe obligatorio)
- Responsive: usar `max-width + margin: auto` para centrar; canvas ya usa `width: 100%` en CSS
- Touch bug UI-02: agregar `user-select: none` y `-webkit-user-select: none` al body y game container en `style.css`

</decisions>

<canonical_refs>
## Canonical References

**Los agentes de research y planning DEBEN leer estos archivos antes de planificar.**

### Requisitos de la fase
- `.planning/REQUIREMENTS.md` §Phase 1 — BUG-01 a BUG-04, CTRL-01 a CTRL-03, GRID-01 a GRID-02, UI-01 a UI-06 (15 requisitos)
- `.planning/ROADMAP.md` §Phase 1 — criterios de éxito observables

### Código existente relevante
- `.planning/codebase/ARCHITECTURE.md` §UI-Input-Layer — estructura del sistema de input
- `.planning/codebase/CONCERNS.md` §Known-Bugs — ubicaciones exactas de los 4 bugs y descripción detallada
- `game.js` líneas 1052-1080 — input system (keyboard + touch) completo
- `game.js` líneas 25-112 — RIVALS array y constants layer completo
- `game.js` líneas 1143-1183 — `buildRivalGrid()` que renderiza las tarjetas de rival select
- `game.js` líneas 1006-1011 — `onDisconnect()` con el alert() a reemplazar
- `style.css` — CSS completo para entender el layout responsive actual
- `index.html` — estructura DOM de las pantallas lobby, rival-select y multiplayer

### Fuente de verdad para la grilla 2026
- `https://www.formula1.com/en/drivers` — lista canónica de pilotos 2026, números y equipos
- `https://www.formula1.com/en/teams` — colores de librea por equipo

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bindTouch(id, flag)` en `game.js:1065-1080`: sistema de touch ya correcto con `preventDefault` y `setPointerCapture`. El bug UI-02 es de CSS (`user-select`), no de JS.
- `buildRivalGrid()` en `game.js:1143-1183`: genera las tarjetas de rival. Para el carousel, este código se adapta (no se reescribe desde cero) para mostrar de a 1 rival con botones prev/next.
- `goTo(name)` en `game.js:1083-1087`: routing de pantallas ya funcional, no tocar.

### Established Patterns
- **No build step**: Cualquier CSS o JS agregado va directo a `style.css` o `game.js`. No hay módulos.
- **Estado en variables globales**: Las modificaciones a `RIVALS` son en el array literal en `game.js`. No hay sistema de carga de datos externo.
- **Canvas fixed-size with CSS scale**: El canvas es `480×640` internamente; CSS `width: 100%` lo escala visualmente. El DPR fix agrega `canvas.width = 480 * devicePixelRatio` y `ctx.scale(dpr, dpr)` para nitidez.

### Integration Points
- El array `RIVALS` se referencia en `buildRivalGrid()`, `pollResults()` (para guardar resultado por rival) y en el localStorage (`cr_rival_<idx>`). Cambiar de 20 a 21 entradas requiere revisar estos tres puntos.
- El fix de BUG-02 (`finish` guard) toca `onMsg` que también maneja `ready`, `start`, `pos`, `restart`. Cuidado de no romper el flujo de mensajes existente.

</code_context>

<specifics>
## Specific Ideas

- El usuario confirmó que hay **22 pilotos en 2026** (no 20 como en v1), con Cadillac como equipo nuevo.
- El usuario quiere que el agente **busque los datos actuales en internet** (formula1.com) en lugar de confiar en datos de entrenamiento.
- El usuario deferred la discusión de carousel y DPR al criterio de Claude — ver decisiones D-08 y D-09.

</specifics>

<deferred>
## Deferred Ideas

- **Rediseño visual** (tipografía, animaciones, colores Alpine) → Phase 3 (UI-07)
- **Swipe gesture** en el carousel de rival select → mejora opcional dentro de Phase 1, no bloqueante
- **Listener dinámico de DPR** en resize/orientación → no necesario para Phase 1
- **Inclinómetro** (steering por acelerómetro) → Out of scope v2 completo

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-26*
