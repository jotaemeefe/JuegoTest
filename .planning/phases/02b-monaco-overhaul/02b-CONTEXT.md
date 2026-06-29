# Phase 2-B: Monaco Gameplay Overhaul - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2-B entrega un juego fundamentalmente más divertido y jugable: cámara que sigue y rota con el auto, Monaco rediseñado desde cero a escala 3-4x, y física re-tuneada para sensación semi-arcade. El objetivo es que al terminar esta fase el juego se sienta como un juego de carreras de verdad.

**Fuera del scope de 2-B** (van a Fase 3):
- Overlay del túnel y entorno decorativo (color blocks del puerto, barreras, etc.)
- Mejoras de IA (AI-01, AI-02, AI-03)
- Música y mejoras de audio
- VFX de daño, overtake, y lap feedback

</domain>

<decisions>
## Implementation Decisions

### Cámara — el cambio más importante

- **D-01:** La cámara sigue al auto y **rota con él** — el auto del jugador siempre apunta hacia arriba (↑) en pantalla. El mundo rota alrededor del auto. Así funciona Micro Machines, RC Pro-Am y la mayoría de los mejores juegos de carreras top-down.

- **D-02:** El auto del jugador se posiciona a ~60% de la altura del canvas desde arriba (y ≈ 380 de 640), no en el centro. Esto da más campo visual hacia adelante (donde importa anticipar curvas) que hacia atrás.

- **D-03: Implementación del transform de cámara en `loop()`:**
  ```
  ctx.save()
  ctx.translate(240, 380)          // foco de cámara: adelantado del centro
  ctx.rotate(-car.angle - Math.PI/2)  // rota mundo para que el auto apunte ↑
  ctx.translate(-car.x, -car.y)    // centra en posición del auto
  [drawTrack() — en world space]
  [drawCar() para cada auto — en world space]
  ctx.restore()
  [HUD, minimap — en screen space]
  ```

- **D-04:** `drawTrack()` y `drawCar()` NO cambian de arquitectura — siguen usando coordenadas world. El canvas transform en `loop()` hace el trabajo. `project()` sigue siendo identidad.

- **D-05:** El HUD (vuelta, posición P1-P4, gap) y el minimap se dibujan **DESPUÉS** del `ctx.restore()`, en screen space, para que no roten con el mundo.

### Monaco — rediseño completo desde cero

- **D-06:** El nuevo `ROAD_SPINE` se diseña desde cero en world space ~**1600×2000px** (vs. el actual 480×640). Escala objetivo: 3.5x. Los puntos del spine nuevo son coordenadas absolutas, no una escala del actual.

- **D-07:** `ROAD_HALF_W` = **80px** (era 28px). Con la cámara siguiendo el auto a 1:1, la pista ocupa ~33% del ancho del canvas en rectas. En curvas puede sentirse más angosta — está bien, es Monaco.

- **D-08:** El nuevo spine de Monaco debe tener **curvas suaves** con puntos intermedios de bezier-like aproximation (múltiples puntos cortos para curvas). Las secciones clave con geometría correcta:
  - Sainte-Dévote: curva a derecha con radio amplio (~200px en new scale)
  - Casino/Massenet: barrido suave subiendo
  - Loews (Grand Hotel Hairpin): horquilla real en U — la curva más cerrada, radio ~80px
  - Portier: curva a derecha bajando al túnel
  - Chicanane post-túnel: izquierda-derecha rápida
  - La Rascasse: curva a derecha, tight pero no tanto como Loews
  - Antony Noghès: curva a derecha de vuelta a meta

- **D-09:** Los waypoints de IA (`AI_WAYPOINTS`) también se redeseñan en el nuevo world space, con suficientes puntos para guiar correctamente en cada sección del circuito. No dependen del ROAD_SPINE — pueden tener más resolución que el spine.

- **D-10:** Los 4 checkpoints (`CPS`) se reposicionan en el nuevo world space. CP0 = Meta (inicio/fin), CP1 = Casino plateau, CP2 = Loews apex, CP3 = Post-tunnel / Tabac.

- **D-11:** `START` (grid de salida) se rediseña para la nueva escala de la recta principal. 4 posiciones en 2x2 con separación mínima de `CAR_RADIUS * 3` = 42px.

- **D-12:** `TUNNEL_ZONE` (para `car.inTunnel`) se actualiza a las nuevas coordenadas del túnel en world space. El boolean `car.inTunnel` se mantiene porque Fase 3 lo usa para audio.

### Física — re-tuning para escala 3.5x

- **D-13:** Todas las constantes de velocidad/fuerza escalan proporcionalmente (~3.5x) para que el auto sienta la misma velocidad relativa a la pista visible:

  | Constante | Valor actual | Valor nuevo |
  |-----------|-------------|-------------|
  | `MAX_SPD_ON` | 190 px/s | **650 px/s** |
  | `MAX_SPD_OFF` | 72 px/s | **250 px/s** |
  | `AUTO_ACCEL` | 160 px/s² | **550 px/s²** |
  | `BRAKE_FORCE` | 350 px/s² | **1200 px/s²** |
  | `CAR_RADIUS` | 14 px | **18 px** |

- **D-14:** `TURN_RATE` se **ajusta por separado** — no escala proporcional. Con cámara rotatoria, el giro se siente más natural. Valor objetivo: **3.8 rad/s** (era 4.5, que era alto para compensar la vista fija). El investigador debe testear qué valor da sensación semi-arcade correcta.

- **D-15:** `FRICTION_K` se mantiene en **1.1** — la fricción es un ratio adimensional, no escala con la pista.

- **D-16:** Sensación buscada: **semi-arcade**. El auto responde rápido pero hay algo de inercia al cambiar de dirección. No hay drift/oversteer. Es como un auto de F1 simplificado.

### Minimap

- **D-17:** Minimap en esquina **superior derecha** del canvas, ~**100×120px**, fondo semitransparente oscuro.

- **D-18:** Contenido del minimap: trazado de Monaco (polyline delgada del ROAD_SPINE en miniatura), punto blanco para el jugador, puntos de color (según rivalData) para cada AI car. No hay labels.

- **D-19:** Escala del minimap: world coords → minimap calculada automáticamente a partir del bounding box del ROAD_SPINE. El minimap se dibuja en screen space (después del ctx.restore()) usando un segundo `ctx.save()/restore()`.

### Visuals — simplificado para 2-B

- **D-20:** Canvas background: color gris oscuro uniforme (`#3a3a4a` — igual que ahora). Sin bloques de color del entorno (agua, edificios, barreras). Solo el trazado.

- **D-21:** La pista se dibuja como: **asfalto** (fill del poly de la pista, `#555`) + **líneas blancas de borde** (stroke del spine +/- ROAD_HALF_W). Es lo mínimo para que la pista sea legible. Sin decoración.

- **D-22:** Overlay del túnel, color blocks de edificios/puerto, y ambiente de Monaco van a **Fase 3**. En 2-B la prioridad es jugabilidad pura.

### Autos y colisiones

- **D-23:** Se mantienen **4 autos** (player + 3 AI). CARS-02 (personalidades), CARS-03 (colisiones 6 pares), CARS-04 (HUD P1-P4) siguen funcionando.

- **D-24:** `resolveCarCollision()` usa `CAR_RADIUS` — con el nuevo valor de 18px la zona de colisión es levemente mayor pero proporcional a la pista más ancha.

### Claude's Discretion

- Cantidad exacta de puntos en el nuevo ROAD_SPINE: el investigador diseña la geometría óptima para Monaco a la escala indicada. Mínimo ~40 puntos para suavidad.
- Cantidad de waypoints de IA: al criterio del agente, suficientes para cubrir todas las curvas.
- Suavizado de cámara (lerp entre posiciones vs. lock directo): el agente puede agregar interpolación suave si ayuda a la sensación. No es obligatorio.
- Posición exacta del minimap y padding: el agente decide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos de la fase
- `.planning/REQUIREMENTS.md` §IA Mejorada (AI-01..AI-03) — out of scope en 2-B
- `.planning/ROADMAP.md` §Phase 3 — para saber qué NO implementar en 2-B
- `.planning/phases/02b-monaco-overhaul/02b-CONTEXT.md` — este archivo (referencia canónica)

### Código base relevante
- `game.js` líneas 1–60 — ROAD_SPINE, CPS, START, constantes de física (todo se reemplaza/retunea)
- `game.js` líneas 100–130 — PERSONALITIES (CARS-02, se mantiene)
- `game.js` líneas 296–380 — sistema de audio (se mantiene intacto)
- `game.js` líneas 404–405 — `project()` función identidad (se mantiene identidad, camera transform va en loop)
- `game.js` líneas 455–670 — `drawTrack()` (se reescribe para nueva pista simplificada)
- `game.js` líneas 593–675 — `drawCar()` (mínimos cambios — usa world coords que siguen siendo válidas)
- `game.js` líneas 681–690 — `isOnTrack()` (se mantiene lógica, funciona con nuevo ROAD_SPINE/ROAD_HALF_W)
- `game.js` líneas 777–825 — `updateAI()` (se mantiene lógica, nuevos waypoints en world space)
- `game.js` líneas 829–894 — `updateHUD()` (se mueve a screen space — después de ctx.restore)
- `game.js` líneas 991–1200 — `loop()` (se agrega camera transform aquí, sin tocar updateCar/updateAI)

### Referencia de Monaco real
- https://www.formula1.com/en/racing/2025/monaco — geometría del circuito (solo referencia visual)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `drawCar(car, carIdx)` en `game.js:593` — se mantiene sin cambios de arquitectura. Ya usa coordenadas relativas al auto (con `project()` identidad → world space). Con el camera transform aplicado en `loop()`, automáticamente dibuja en el lugar correcto.
- `updateAI(car, dt)` en `game.js:777` — lógica de navegación por waypoints y steering no cambia. Solo cambia `AI_WAYPOINTS` al nuevo world space.
- `resolveCarCollision(a, b)` — se mantiene, basado en distancia euclidiana entre autos. Funciona con cualquier world space.
- `isOnTrack(x, y)` en `game.js:681` — algoritmo de segment-distance se mantiene. Lee `ROAD_SPINE` y `ROAD_HALF_W`. Con los nuevos valores funciona automáticamente.
- Sistema de audio completo — sin tocar.
- HUD DOM elements (hudLap, hudPos, hudRole) — se mantienen, solo hay que asegurarse de llamar `updateHUD()` en screen space (después del ctx.restore).

### Established Patterns
- **Identity projection**: `project()` es identidad — se mantiene así. El camera transform en `loop()` es el mecanismo correcto, no cambiar `project()`.
- **No build step**: Vanilla JS puro. El camera transform es puro Canvas 2D API (`ctx.save/restore/translate/rotate`).
- **cars[] array**: 4 autos, ya refactorizado en Phase 2. No cambiar.
- **inTunnel boolean**: `car.inTunnel` se sigue seteando (aunque el overlay visual no existe en 2-B) porque Phase 3 lo usa para audio. TUNNEL_ZONE se actualiza a nuevas coordenadas.

### Integration Points
- `loop()` es el único lugar donde se agrega el camera transform. Hay 3 fases en loop: `countdown`, `racing`, `done`. Las tres deben usar el camera transform para consistencia.
- El minimap (`drawMinimap()`, función nueva) se llama después de `ctx.restore()` en las 3 fases de loop.
- `drawTunnelRoof()` ya no se llama en 2-B (sin overlay visual de túnel). La lógica de setear `car.inTunnel` sí permanece (en `loop()` o `updateCar()` — donde esté ahora).

</code_context>

<specifics>
## Specific Ideas

- Usuario quiere que el juego sea "totalmente otro" después de 2-B. El baremo es: ¿da ganas de seguir jugando? ¿las curvas se pueden negociar? ¿hay sensación de velocidad?
- Referencia mental: **Micro Machines** (cámara que sigue), **RC Pro-Am** (top-down rotatorio), **F1 Race** (Game Boy). No simulador, no pixel-perfect Monaco — un juego de carreras divertido.
- Monaco es el circuito definitivo: Loews debe sentirse como un hairpin de verdad (lento, frena fuerte), la chicane del túnel rápida, la recta principal satisfactoria.
- El investigador debe prestar especial atención al radio de Loews en el nuevo ROAD_SPINE: si queda demasiado cerrado para los valores de TURN_RATE, el juego se rompe igual que ahora. El criterio es que el jugador pueda negociar Loews a ~30% de velocidad máxima con freno normal.

</specifics>

<deferred>
## Deferred Ideas

- **Overlay del túnel** (TRACK-02, TRACK-03) → Fase 3
- **Color blocks del entorno** (agua, edificios, barreras) → Fase 3
- **AI-01** (frenado real 0.70x) → Fase 3 — por ahora sigue en 0.35x
- **AI-02/AI-03** (variación lateral, personalidad en línea) → Fase 3
- **AUDIO-01/02/03** → Fase 3
- **VFX-01..VFX-05** → Fase 3
- **DRS-01** → Fase 3
- **UI-07** (rediseño visual de pantallas) → Fase 3
- **Smooth camera lerp**: puede agregarse como refinamiento si la cámara rígida genera mareo. No es bloqueante para 2-B.

</deferred>

---

*Phase: 2B-Monaco-Overhaul*
*Context gathered: 2026-06-29*
