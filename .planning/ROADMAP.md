# Roadmap: Colapinto Kart Racer

## Milestones

- ✅ **v2.0 Colapinto F1 Racer** — Phases 1-4B (shipped 2026-08-15)
- 🚧 **v3.0 Arcade Rebirth** — Phases 5-11 (in progress)

## Phases

<details>
<summary>✅ v2.0 Colapinto F1 Racer (Phases 1-4B) — SHIPPED 2026-08-15</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-06-26
- [x] Phase 2: Monaco + 4 Cars (4/4 plans) — completed 2026-06-28
- [x] Phase 2b: Monaco Gameplay Overhaul (4/4 plans) — completed 2026-06-29
- [x] Phase 2c: Gameplay Fix (ad-hoc) — completed 2026-07-02
- [x] Phase 3: AI, Audio & Polish (1/1 plan) — completed 2026-07-04
- [x] Phase 3b: Gameplay Refactor (4/4 plans) — completed 2026-07-05
- [x] Phase 4A: Grand Prix Pixel Revolution (1 plan) — completed 2026-07-11
- [x] Phase 4B: Racecraft & Visual Coherence (1 plan) — completed 2026-07-11

Full phase details archived: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### 🚧 v3.0 Arcade Rebirth (In Progress)

**Milestone Goal:** Reconstruir el juego como un kart racer arcade en tercera persona —
cámara/manejo pseudo-3D, derrape tipo kart, un kartódromo cerrado con identidad propia —
reemplazando por completo el sistema top-down de vueltas en Mónaco.

**Phase Numbering:** Continues from v2.0's last phase (4B). v3.0 starts at Phase 5, plain
integers. Decimal phases (e.g. 5.1) reserved for urgent insertions if needed later.

- [ ] **Phase 5: Chase-Cam Renderer Foundation** - Pseudo-3D road-segment renderer replaces top-down view, proven on a test loop with curve+crest handled correctly and mobile framerate validated
- [ ] **Phase 6: Kart Drift Handling** - Track-space car physics with a tunable, grounded drift state machine (initiate/hold/charge/release boost), validated in an isolated harness
- [ ] **Phase 7: AI Port & Drift Parity** - AI rivals ported to track-space coordinates with the same drift capability as the player and all existing racecraft preserved
- [ ] **Phase 8: Kartódromo Content & Kart Art** - One real, complete kartodromo with elevation and landmarks, plus new chase-view kart/pilot sprites, playable end-to-end
- [ ] **Phase 9: Progression — Best Lap, Rank & Ghost** - Players get a reason to replay: persisted best lap per track, time-based rank grading, and a ghost car to chase
- [ ] **Phase 10: Multiplayer Payload Update** - P2P racing works again on the new track-space coordinate model
- [ ] **Phase 11: Mobile Regression & Polish Pass** - Full mobile/iOS re-verification and expanded automated test coverage for the rebuilt game

## Phase Details

### Phase 5: Chase-Cam Renderer Foundation
**Goal**: The top-down renderer is replaced by a pseudo-3D, third-person chase-cam road-segment renderer that looks and feels fast, and is proven correct on curves, hills, and their combination before any real track is authored.
**Depends on**: Nothing (first phase of v3.0; builds on existing Canvas 2D/game-loop foundation)
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04
**Success Criteria** (what must be TRUE):
  1. The game renders a closed test loop from a third-person camera behind the kart using per-segment projection (no top-down view, no WebGL)
  2. A dedicated test segment combining a curve and a crest renders without kinks or self-intersection
  3. Speed sensation is present: segment scroll rate, alternating rumble strips, and shake/FOV response all scale visibly with speed
  4. The renderer caps drawn segments to a fixed draw-distance and holds a playable framerate on real iOS Safari and a mid-tier Android device
**Plans**: 7 plans (7 waves — sequential; all touch game.js)
- [ ] 05-01-PLAN.md — Synthetic test-loop track data: retire Monaco, author closed-oval ROAD_SPINE + dense SEGMENTS[] table (curve/elevation/width/color, curve+crest test case)
- [ ] 05-02-PLAN.md — Scanline segment projector + chase camera: combined curve+elevation projection, draw-distance culling, pixel-texture road (D-08), wired into live loop
- [ ] 05-03-PLAN.md — Sprite compositing: early illustrated frame-selected kart (D-09) + continuously depth-scaled rivals (no pop-in)
- [ ] 05-04-PLAN.md — Speed sensation (RENDER-02): speed-scaled scroll/rumble/FOV + high-speed shake/vignette + retained engine-pitch
- [ ] 05-05-PLAN.md — HUD restyle (D-11/D-13) + copy swap (D-02) + DRS/minimap removal (D-12) + lobby multiplayer hide (D-05)
- [ ] 05-06-PLAN.md — Chase-cam smoke tests + repair Monaco-era tests + RELEASE.md/ROADMAP/CLAUDE.md documentation
- [ ] 05-07-PLAN.md — Human checkpoint: real-device (iOS Safari + Android) profiling, curve+crest visual, mobile-regression + first-playable sign-off
**UI hint**: yes

### Phase 6: Kart Drift Handling
**Goal**: The car's state and handling move from world-space (x, y, angle) to track-space (distance, lateral offset), with a genuine kart-style drift state machine tuned to a grounded (not floaty) feel, validated in an isolated test harness before touching the real track.
**Depends on**: Phase 5 (drift needs a correctly-projected, visible road to tune against)
**Requirements**: DRIFT-01, DRIFT-02, DRIFT-03
**Success Criteria** (what must be TRUE):
  1. The player's car state is represented as distance-traveled and lateral offset within the track, not world x/y/angle
  2. Holding the drift input locks a slip angle proportional to steering, distinct from normal turning, and releasing it grants a speed boost scaled by how long the drift was charged
  3. Drift feel is tunable and testable in a standalone harness independent of the real track content
  4. Playtesting confirms the drift feels grounded/mechanical rather than floaty or binary on/off
**Plans**: TBD

### Phase 7: AI Port & Drift Parity
**Goal**: AI rivals race convincingly in the new track-space coordinate model, with the same drift capability as the player, so cornering never looks "on rails" next to the player's sliding kart.
**Depends on**: Phase 6 (AI needs the track-space model and drift state machine to port against)
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. AI cars navigate the track using the same track-space (distance, offset) model as the player, with no leftover world-space waypoint following
  2. AI cars enter and release drift through corners using a decision rule (not scripted per corner), visibly sliding like the player does
  3. Existing racecraft — predictive traffic avoidance, defensive blocking, rubber-band catch-up, personality-driven pressure mistakes — still functions in the new model
**Plans**: TBD

### Phase 8: Kartódromo Content & Kart Art
**Goal**: One fully realized, closed-lap kartodromo with elevation changes and recognizable landmarks is playable end-to-end, viewed through new chase-cam kart/pilot sprites — proving the game has a real sense of place instead of an empty/generic track.
**Depends on**: Phase 7 (content authoring should happen only after renderer, drift, and AI are proven correct)
**Requirements**: TRACK-01, TRACK-02, ART-01
**Success Criteria** (what must be TRUE):
  1. A dense per-segment track table (curvature, elevation, width, color) replaces the old sparse spine and drives the one real kartodromo
  2. The kartodromo has visible elevation changes and 2-3 recognizable landmarks a player can identify and describe
  3. The kart and pilot are drawn from behind in 3-5 distinct turn-angle frames (not a rotated top-down sprite), in the existing pixel-art style
  4. A full lap of the real kartodromo is completable start-to-finish with no rendering or collision breakage
**Plans**: TBD
**UI hint**: yes

### Phase 9: Progression — Best Lap, Rank & Ghost
**Goal**: Players have a persistent reason to come back and improve: their best lap on the new track is saved, graded against thresholds, and can be chased as a ghost car.
**Depends on**: Phase 8 (progression needs a real track to measure against)
**Requirements**: PROGRESS-01, PROGRESS-02, PROGRESS-03
**Success Criteria** (what must be TRUE):
  1. A player's best lap time on the kartodromo persists across sessions in localStorage
  2. Finishing a lap shows a rank/grade (e.g. bronze/silver/gold) based on time thresholds
  3. A translucent, non-colliding ghost car replays the player's own best lap during a race
**Plans**: TBD

### Phase 10: Multiplayer Payload Update
**Goal**: P2P racing works again on the rebuilt game, with the network payload and remote-car rendering re-pointed at the new track-space coordinate model.
**Depends on**: Phase 6 (only needs track-space car state to exist; independent of AI/content/progression work)
**Requirements**: MP-01, MP-02
**Success Criteria** (what must be TRUE):
  1. The `pos` network message carries `{trackDistance, lateralOffset, speed, driftState}` instead of world x/y/angle/lap/cp
  2. Incoming `pos` data is validated against track-space bounds before being applied
  3. `remoteRenderPos()` projects and interpolates the remote kart correctly in the new chase-cam view, with no visible jitter beyond the existing 50ms smoothing
  4. Two players can complete a full multiplayer race on the new kartodromo via a room code, same as before the rewrite
**Plans**: TBD

### Phase 11: Mobile Regression & Polish Pass
**Goal**: Every hard-won mobile/iOS fix from v2.0 still works after the full rewrite, and the automated test suite covers the new chase-cam experience.
**Depends on**: Phase 10 (final pass, after all rendering/input/audio/network surfaces have changed)
**Requirements**: MOBILE-01, MOBILE-02
**Success Criteria** (what must be TRUE):
  1. Lazy AudioContext init on first user gesture, Pointer Events touch controls (including any new drift button), devicePixelRatio-aware sizing, and viewport-fit layout are all re-verified working end-to-end on the rebuilt game
  2. `tests/` includes smoke tests and reference captures for the chase-cam view, HUD, and new controls (including drift input) on both desktop and mobile viewport sizes
  3. The game plays without visual cutoff or broken controls on a real iOS Safari session and a small mobile viewport (≤375px width)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Foundation | v2.0 | 4/4 | Complete | 2026-06-26 |
| 2. Monaco + 4 Cars | v2.0 | 4/4 | Complete | 2026-06-28 |
| 2b. Monaco Overhaul | v2.0 | 4/4 | Complete | 2026-06-29 |
| 2c. Gameplay Fix | v2.0 | ad-hoc | Complete | 2026-07-02 |
| 3. AI, Audio & Polish | v2.0 | 1/1 | Complete | 2026-07-04 |
| 3b. Gameplay Refactor | v2.0 | 4/4 | Complete | 2026-07-05 |
| 4A. Grand Prix Pixel Revolution | v2.0 | 1/1 | Complete | 2026-07-11 |
| 4B. Racecraft & Visual Coherence | v2.0 | 1/1 | Complete | 2026-07-11 |
| 5. Chase-Cam Renderer Foundation | v3.0 | 0/7 | Planned | - |
| 6. Kart Drift Handling | v3.0 | 0/? | Not started | - |
| 7. AI Port & Drift Parity | v3.0 | 0/? | Not started | - |
| 8. Kartódromo Content & Kart Art | v3.0 | 0/? | Not started | - |
| 9. Progression — Best Lap, Rank & Ghost | v3.0 | 0/? | Not started | - |
| 10. Multiplayer Payload Update | v3.0 | 0/? | Not started | - |
| 11. Mobile Regression & Polish Pass | v3.0 | 0/? | Not started | - |

---

## Release 3: Championship Mode *(milestone futuro — post v2.0)*

**Goal:** Darle al juego un meta-loop real. El jugador disputa una temporada F1 completa contra los 20 pilotos del grid en 6 circuitos icónicos, acumulando puntos hasta coronar un campeón.

**Depends on:** v2.0 completo (las 3 fases anteriores en estado done)

**Scope tentativo:**

### Phase R3-1: Multi-Track Engine

Extender el sistema de pistas para soportar múltiples circuitos. Cada pista tiene su geometría canvas, waypoints de IA, y visuales de color blocks. Circuitos objetivo: Monza, Silverstone, Spa, Suzuka, Interlagos (Monaco ya existe desde Phase 2).

### Phase R3-2: Season Mode

Sistema de temporada: calendario de 6 carreras, puntos F1 (25-18-15-12-10-8-6-4-2-1), tabla de posiciones entre carreras, estado persistido en localStorage, pantalla de campeón al final de la temporada.

### Phase R3-3: Race Weekend

Clasificación antes de cada carrera para definir el grid de salida. Mejoras de IA para que los 20 pilotos compitan de forma creíble en la tabla de puntos durante toda la temporada.

**Modo:** Solo vs CPU. Multiplayer NO está en scope de Release 3.

**Visión de largo plazo:** Post Release 3, evaluar conversión a app nativa iOS/Android con multiplayer real. Ver [[vision-ios-android-app]].

**Seed:** `.planning/seeds/championship-season-mode.md`

---

## Release 4: Race Strategy & Drama *(milestone futuro — post R3)*

**Goal:** Transformar cada carrera individual de "andá lo más rápido posible" a un problema de optimización con incertidumbre. Cada carrera debe tener decisiones genuinas y momentos impredecibles que no se pueden anticipar.

**Depends on:** Release 3 completo

**Fundamento teórico:**

- *Variable Reward Schedules* (Skinner): eventos aleatorios (Safety Car, lluvia) crean re-jugabilidad que ninguna mejora técnica puede replicar.
- *Decisiones bajo incertidumbre* (Nash): el pit stop timing es un problema minimax real — el jugador no sabe cuándo pica la IA.
- *Flow state + Mastery expression* (Csikszentmihalyi): sector times y Push to Pass dan a jugadores expertos capas de profundidad invisibles para novatos.

**Scope:**

### Phase R4-1: Tire Strategy

- 3 compuestos: Blandos (5 vueltas), Medios (8 vueltas), Duros (12 vueltas, algo más lentos)
- Degradación gradual: velocidad cae ~5% por vuelta una vez agotado el compuesto
- Pit stop: ~8 segundos parado + selector de compuesto nuevo
- Selección pre-carrera: el jugador elige estrategia de entrada
- IA con estrategia propia opaca — no sabés cuándo pican

### Phase R4-2: Dynamic Race Events

- **Safety Car** (~20% de probabilidad al haber colisión): neutraliza la carrera, compacta el campo, destruye ventajas construidas; la decisión "pico bajo SC o no" es el momento más dramático del F1
- **VSC** (Virtual Safety Car): versión suave — congela brechas pero no las anula
- **DRS**: habilitado en rectas largas por circuito; permite atacar autos más rápidos y crea el mechanic de defensa de posición
- **Lluvia aleatoria** (15% por carrera): Blandos pierden agarre, Duros aguantan; voltea la estrategia completa

### Phase R4-3: Mastery Feedback

- **Sector times S1/S2/S3**: color coding — verde (mejor del año), violeta (mejor personal), amarillo (más lento)
- **Push to Pass**: boost de 5 segundos que recarga en media vuelta; decisión táctica por vuelta
- **Radio del ingeniero**: mensajes contextuales — "Estás P2, Norris a 1.8 segundos y viene rápido"

### Phase R4-4: Lap Count Selection

- **En temporada**: selector al configurar la temporada — Corta (3 vueltas), Estándar (5 vueltas), Larga (10 vueltas). Carreras largas hacen el pit stop casi obligatorio; cortas lo hacen opcional. Afecta la profundidad estratégica de R4-1.
- **En VS CPU y multiplayer 1v1**: selector pre-carrera — 3 / 5 / 10 vueltas. La preferencia se persiste en localStorage.

**El momento que hace adictivo el juego:** estás P1 con neumáticos degradados, el Safety Car sale por una colisión, la IA pica y sale con Blandos frescos — tenés 3 segundos para decidir si entrás o defendés. Ese momento no puede existir en el juego sin este release.

**Seed:** `.planning/seeds/race-strategy-drama.md`

---

## Release 5: Sim-Lite Physics & Challenge *(milestone futuro — post R4)*

**Goal:** Darle al auto carácter real. El jugador puede exceder los límites del coche con consecuencias físicas, la pista tiene reglas que se hacen cumplir, y el setup pre-carrera convierte cada circuito en una decisión estratégica distinta.

**Depends on:** Release 4 completo

**Scope:**

### Phase R5-1: Physics with Traction Limit

- Oversteer al acelerar demasiado rápido en salida de curva lenta
- Understeer al entrar demasiado rápido en curva rápida
- Traction limit: el gas a fondo desde velocidad baja produce wheelspin y pérdida de control
- El modelo actual (friction + auto-accel) se extiende, no se reemplaza

### Phase R5-2: Track Limits & Penalty System

- Cortar una curva activa un contador de advertencias
- Tras 3 advertencias: time penalty de 5 segundos aplicado al resultado final
- Zonas de límite definidas por pista (no genéricas)
- IA respeta los mismos límites que el jugador

### Phase R5-3: Car Setup & Adaptive AI

- Pantalla de setup pre-carrera: downforce (velocidad curva vs recta) y balance de frenos
- El setup óptimo varía por circuito — Monaco pide máximo downforce, Monza mínimo
- IA adaptativa: si el jugador lidera el campeonato, los rivales del top 3 aumentan agresividad
- ERS orgánico: energía se carga frenando, se gasta acelerando — reemplaza el Push to Pass discreto de R4

**Seed:** `.planning/seeds/sim-lite-physics.md`

---

## Release 6: The Colapinto Story *(milestone futuro — post R5)*

**Goal:** Transformar el juego en *el* juego de Franco Colapinto — una campaña narrativa ramificada que recorre su carrera real desde el karting argentino hasta la F1, donde tus resultados vs. la historia real determinan cómo se desarrolla el relato.

**Depends on:** Release 5 completo (physics profiles son la base de las categorías)

**Concepto central:** "Elige tu propia aventura" con fundamento histórico. Siempre avanzás de categoría si alcanzás un mínimo (no hay bloqueos frustrantes), pero tus resultados relativos a lo que hizo Colapinto en la realidad bifurcan la narrativa: dominás F2 → Alpine te llama antes; llegás justo → Williams te invita igual pero con menos fanfarria. Múltiples caminos, un destino común: la F1.

**El arco histórico:**
- Karting (Argentina → Europa, 2014–2018)
- Formula 4 (UAE / Italia, 2019)
- Formula Regional / F3 por Alpine Academy (2020–2022)
- Formula 2 con Prema — revelación (2023)
- Debut F1 en Williams, Monza — llamado de emergencia 48hs antes (2024)
- Alpine F1 Team, temporada completa (2025)

**Scope:**

### Phase R6-1: Career Engine
- Máquina de estados narrativos: categoría actual, resultados acumulados, variables de bifurcación (relación con Alpine, performance relativa a historia real)
- Save/load del progreso de carrera en localStorage
- Sistema de comparación histórica: cada carrera tiene el resultado real de Colapinto como referencia; el delta alimenta el estado narrativo
- Pantalla de hub entre carreras: calendario, tabla, próxima carrera

### Phase R6-2: Category Physics Profiles
- **Karting:** cero downforce, grip mecánico puro, top speed ~120px/s, muy responsivo al volante
- **F4:** primeras alas, potencia limitada, ~150px/s — primer contacto con sensación de fórmula
- **F3 / Formula Regional:** downforce real, ~170px/s, el auto empieza a sentirse rápido de verdad
- **F2:** casi F1, pit stop obligatorio en Feature Race, sprint race sin parada
- **F1:** el juego existente — Monaco y todos los sistemas de R3/R4/R5 activos

### Phase R6-3: Career Tracks
- Circuitos de karting (trazados cortos, ~8 waypoints, ambientación kartodromo)
- Circuitos junior: Mugello (F3), Silverstone (F2 feature), Jeddah (F2 sprint), Monza (debut F1)
- Cada circuito tiene dificultad escalada a la categoría que lo usa

### Phase R6-4: Branching Narrative
- **Cards narrativas** entre carreras: estilo periódico deportivo — titular, arte sintético en canvas, cita de Colapinto o su entorno
- **Momentos de decisión:** "Alpine te ofrece un contrato de academia — ¿aceptás?" / "Williams necesita un piloto en 48hs para Monza, ¿estás listo?"
- **Bifurcaciones por rendimiento:** superaste historia / igualaste / quedaste por debajo → cada nivel desbloquea variantes del relato
- **Múltiples finales en F1:** campeón del mundo / piloto establecido top 5 / rookie sólido — según tu temporada F1

**Por qué este es el juego de Colapinto y no uno más:** el arco ya existe — el pibe de Pilar que se fue solo a Europa, la academia, el llamado a las 48hs para Monza, el debut top 10. El juego lo convierte en algo que se puede *jugar* y donde tus elecciones importan dentro de ese marco real.

**Seed:** `.planning/seeds/colapinto-story-career.md`
