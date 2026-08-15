# Roadmap: Colapinto F1 Racer v2.0

**Project:** Colapinto F1 Racer
**Milestone:** v2.0
**Phases:** 3
**Requirements:** 35 v2 requirements

---

## Phases

- [x] **Phase 4A: Grand Prix Pixel Revolution** — 22-car five-lap Grand Prix, midfield start, longer/wider circuit, non-sticky impulse contacts, full pixel-art presentation and release smoke/visual validation.
- [x] **Phase 4B: Racecraft & Visual Coherence** — intentional pixel-art scene composition, unique props/crowds, legal DRS, extended straight/grid and a clean-racing mastery score.

- [x] **Phase 1: Foundation** — Bug fixes, expanded controls, 2026 grid, and responsive UI. No architecture changes — immediate playability improvements on the existing oval.
- [x] **Phase 2: Monaco + 4 Cars** — Replace the oval with the Monaco circuit and refactor the car system to support 4 simultaneous cars (1 player + 3 AI). The two largest structural changes in v2.
- [x] **Phase 2b: Monaco Gameplay Overhaul** — Rotating follow camera (car always points up), Monaco redesigned at 3.5x scale in 1600x2000 world space, physics re-tuned, minimap added. Correction phase to make the game actually fun before Phase 3 polish.
- [x] **Phase 2c: Gameplay Fix** — Post-2b course correction driven by automated visual testing: Monaco barrier walls, collision-sticking fix, non-crossing circuit redesign (57-pt spine), physics slowed for control (MAX_SPD 650→450, TURN_RATE 3.8→4.5), wrong-way detector, and **VS CPU reduced from 4 cars to 1v1** (player + one selected rival). AI braking for corners landed here early.
- [x] **Phase 3: AI, Audio & Polish** — Improved AI with real braking and personalities, background music, audio enhancements, visual feedback effects (damage tint, impact shake, overtake flash, DRS speed lines), DRS boost, lap-time feedback, and an Alpine blue+pink UI redesign. Adapted to the 1v1 reality: one rival with a skill-derived personality.
- [x] **Phase 3b: Gameplay Refactor** — Correction phase from user playtest of the Phase 3 build: real finish-line crossing (win was declared 200px early), continuous track-progress metric replacing discrete checkpoint ranking (fixes random overtake messages and fake gaps), anti-stick collision physics with tangential slide, wall grinding instead of snap-stop, lateral grip/micro-drift, AI racecraft (avoidance, rubber-band, pressure mistakes), and a Monaco presentation pass (environment blocks, skid marks, sparks).

---

## Phase Details

### Phase 1: Foundation

**Goal:** The existing game runs cleanly with zero known bugs, expanded keyboard controls, the correct 2026 F1 grid, and a responsive layout that works on any device.
**Depends on:** Nothing — all changes are additive or corrective; no architectural dependencies.
**Requirements:** BUG-01, BUG-02, BUG-03, BUG-04, CTRL-01, CTRL-02, CTRL-03, GRID-01, GRID-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria:**

1. Clicking "Revancha" in solo mode restarts cleanly every time with no double-reset audio glitch.
2. A player can steer and brake using arrow keys, WASD, or spacebar in addition to the original A/D/S keys.
3. The rival grid shows all 21 correct 2026 F1 drivers with accurate team colors and numbers.
4. On a 375px-wide phone screen, rival selection is navigable as a carousel (not an overflowing grid), and tapping never accidentally selects text or UI elements.
5. The multiplayer room screen shows a "Copiar código" button that copies the code and shows a "Copiado!" toast; peer disconnection shows an in-game modal instead of a blocking `alert()`.

**Plans:** 4/4 plans executed
Plans:

- [x] 01-01-PLAN.md — Bug fixes (BUG-01–04), spacebar brake (CTRL-03), 2026 RIVALS array (GRID-01, GRID-02)
- [x] 01-02-PLAN.md — Responsive layout verification (UI-01), mobile text-select fix (UI-02), DPR canvas scaling (UI-03)
- [x] 01-03-PLAN.md — Mobile rival carousel prev/next (UI-04)
- [x] 01-04-PLAN.md — Copy room code button + toast (UI-05), disconnect modal (UI-06)

**UI hint:** yes

### Phase 2: Monaco + 4 Cars

**Goal:** Races take place on a faithful Monaco circuit with 4 cars on track simultaneously — the player plus 3 AI opponents with distinct personalities — with full collision detection between all cars.
**Depends on:** Phase 1
**Requirements:** TRACK-01, TRACK-02, TRACK-03, TRACK-04, CARS-01, CARS-02, CARS-03, CARS-04
**Success Criteria:**

1. The race track visually resembles Monaco: Loews hairpin, Casino Square, Massenet, tunnel, Swimming Pool, Rascasse are all recognizable landmarks drawn in color blocks on the canvas.
2. Driving through the tunnel darkens the car with a polygon overlay; exiting the tunnel removes it.
3. Three AI cars appear on the grid at race start and drive laps independently of the player; their starting positions and lap counts are tracked separately.
4. The HUD shows a live P1/P2/P3/P4 classification that updates in real time as cars overtake each other.
5. When two cars collide, both are physically deflected; the collision system covers all 6 possible pairs among the 4 cars.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — CARS-01 refactor: local/remote -> cars[] array (4 autos en solo, 2 en multi)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — TRACK-01 + TRACK-04: geometría de Mónaco (ROAD_SPINE, waypoints, checkpoints)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — TRACK-02 + TRACK-03 + BUG-OFFTRACK: ambientación, overlay de túnel, autos siempre visibles

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — CARS-02 + CARS-03 + CARS-04: personalidades IA, colisión 6 pares, HUD P1-P4

### Phase 2b: Monaco Gameplay Overhaul

**Goal:** The game is fundamentally more fun and playable: rotating follow camera so the car always points up on screen, Monaco redesigned from scratch at 3.5x scale (1600x2000 world space), physics re-tuned proportionally, minimap added for global circuit awareness.
**Depends on:** Phase 2
**Requirements:** TRACK-01, TRACK-04 (geometry and checkpoints in new world space)
**Success Criteria:**

1. The player car always points UP (↑) on screen regardless of direction of travel — the world rotates around the car (Micro Machines / RC Pro-Am camera style).
2. The Monaco circuit in 1600x2000 world space is navigable: Loews hairpin requires genuine braking (~30-40% speed), the tunnel section runs fast, the straight feels satisfying.
3. A minimap in the top-right corner (100x120px) shows the circuit outline and all 4 car positions in real time.
4. All HUD elements (P1-P4, lap counter, damage bar) remain static on screen — they do not rotate with the world.
5. Zero JavaScript console errors during any game phase (countdown, racing, done).

**Plans:** 4 plans in 4 sequential waves
Plans:
**Wave 1**

- [x] 02b-01-PLAN.md — All constants: ROAD_SPINE (52 pts, 1600x2000), physics (MAX_SPD_ON=650, BRAKE_FORCE=1200, TURN_RATE=3.8), AI_WAYPOINTS (43 pts), CPS, START, TUNNEL_ZONE; extract inTunnel setter; remove drawTunnelRoof

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02b-02-PLAN.md — Rewrite drawTrack(): fillRect(-4000,-4000,8000,8000) background, kerb dashes at [60,60] scale, remove environment colour blocks and watermark, new META stripe at x=520

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02b-03-PLAN.md — Camera transform in loop() (ctx.save/translate/rotate/translate/restore), move 6 screen-space elements after restore, add drawMinimap() function, update drawOffTrackVignette() center to screen space

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02b-04-PLAN.md — Integration verification: subsumed by the Phase 2c automated visual-testing pass (Puppeteer, 16 screenshots) which surfaced the P0 playability bugs fixed in 2c. See `.planning/phases/02c-gameplay-fix/02c-VISUAL-TESTING.md`.

### Phase 3b: Gameplay Refactor

**Goal:** The game *cierra*: racing contact feels physical (bump and slide, never glue), the finish line is the finish line, race feedback matches what the player sees, and Monaco stops feeling empty.
**Depends on:** Phase 3
**Trigger:** User playtest feedback on PR #3 (2026-07-05). Root causes confirmed in `.planning/phases/03b-gameplay-refactor/03b-RESEARCH.md`.
**Requirements:** R3B-01 … R3B-10 (see wave plans)
**Success Criteria:**

1. The win overlay never appears before the car visually crosses the META stripe (segment-crossing test, verified by automated race).
2. Ramming the rival head-to-tail for 5 seconds always ends with the cars sliding apart — never pinned in place; a glancing wall touch preserves ≥60% of speed (grind, not stop).
3. ¡LO PASÉ!/¡TE PASARON! fire exactly once per actual pass (progress-ordering flip stable ≥0.6s), never during side-by-side jitter, and the gap indicator shows real seconds derived from track progress.
4. The AI visibly avoids the player instead of driving through them; defensive rivals block, aggressive ones attack; races stay within ±8s after 3 laps (rubber-band).
5. Monaco has identity again: harbour, buildings, tunnel roof, skid marks and wall sparks — at 60fps with zero console errors.

**Plans:** 4 plans in 4 sequential waves
Plans:
**Wave 1**

- [x] 03b-01-PLAN.md — trackProgress() primitive, real finish-line crossing, gate-radius fix, honest overtake events + real gaps (10/10 checks — see 03b-01-SUMMARY.md)

**Wave 2** *(blocked on Wave 1)*

- [x] 03b-02-PLAN.md — Collision refactor (tangential slide, 50/50 separation), wall grinding, lateral grip/micro-drift, camera smoothing + mobile viewport fix (10/10 checks — see 03b-02-SUMMARY.md)

**Wave 3** *(blocked on Wave 2)*

- [x] 03b-03-PLAN.md — AI racecraft: sticky-side avoidance with boxed lift, defensive one-move block, rubber-band, pressure mistakes; per-car collision escape sides (6/6 checks + W1/W2 regressions — see 03b-03-SUMMARY.md)

**Wave 4** *(blocked on Wave 3)*

- [x] 03b-04-PLAN.md — ARCADE PIVOT: nitro replaces DRS, real speed caps (terminal-velocity bug found & fixed), fast+clean AI (TTC avoidance, traffic braking), full Monaco visual layer (10/10 checks + all regressions — see 03b-04-SUMMARY.md)

### Phase 3: AI, Audio & Polish

**Goal:** Racing feels tense and dramatic: AI opponents brake for corners and have distinct driving personalities, background music builds atmosphere, and visual effects celebrate overtakes and communicate damage.
**Depends on:** Phase 2b
**Requirements:** AI-01, AI-02, AI-03, AUDIO-01, AUDIO-02, AUDIO-03, VFX-01, VFX-02, VFX-03, VFX-04, VFX-05, DRS-01, UI-07
**Success Criteria:**

1. AI cars visibly slow down before tight corners (Loews, Rascasse) and their lines vary lap-to-lap; the aggressive AI takes tighter lines than the defensive AI.
2. Background music plays during the race and fades out when the checkered flag falls.
3. When the player's car takes heavy damage, the screen tints progressively from orange to red and shakes noticeably on hard impacts.
4. Overtaking a rival triggers a visible flash on the passed car and a rising synth tone; being overtaken triggers a flash on the player's car.
5. After each lap crossing, the player sees their lap time compared to their personal best ("1:23.4 +0.8s récord" or "RÉCORD PERSONAL! -0.3s" in gold). The results screen always shows the best lap with a "--:--" placeholder if no lap has been completed.
6. When within 60px of the car ahead at the detection point, the HUD shows "DRS DISPONIBLE"; pressing the assigned button activates a speed boost for 3 seconds; the indicator resets at the next lap. AI cars use DRS under the same condition.
7. The lobby, rival select, and results screens have an updated visual design with impactful typography and Alpine brand colors (blue/pink).

**Plans:** TBD
**UI hint:** yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-06-26 |
| 2. Monaco + 4 Cars | 4/4 | Complete   | 2026-06-28 |
| 2b. Monaco Overhaul | 4/4 | Complete | 2026-06-29 |
| 2c. Gameplay Fix | ad-hoc | Complete | 2026-07-02 |
| 3. AI, Audio & Polish | 1/1 | Complete | 2026-07-04 |
| 3b. Gameplay Refactor | 4/4 | Complete | 2026-07-05 |

---

## Coverage

| Requirement | Phase |
|-------------|-------|
| BUG-01 | Phase 1 |
| BUG-02 | Phase 1 |
| BUG-03 | Phase 1 |
| BUG-04 | Phase 1 |
| CTRL-01 | Phase 1 |
| CTRL-02 | Phase 1 |
| CTRL-03 | Phase 1 |
| GRID-01 | Phase 1 |
| GRID-02 | Phase 1 |
| UI-01 | Phase 1 |
| UI-02 | Phase 1 |
| UI-03 | Phase 1 |
| UI-04 | Phase 1 |
| UI-05 | Phase 1 |
| UI-06 | Phase 1 |
| TRACK-01 | Phase 2 / Phase 2b |
| TRACK-02 | Phase 2 (deferred to Phase 3) |
| TRACK-03 | Phase 2 (deferred to Phase 3) |
| TRACK-04 | Phase 2 / Phase 2b |
| CARS-01 | Phase 2 |
| CARS-02 | Phase 2 |
| CARS-03 | Phase 2 |
| CARS-04 | Phase 2 |
| AI-01 | Phase 3 |
| AI-02 | Phase 3 |
| AI-03 | Phase 3 |
| AUDIO-01 | Phase 3 |
| AUDIO-02 | Phase 3 |
| AUDIO-03 | Phase 3 |
| VFX-01 | Phase 3 |
| VFX-02 | Phase 3 |
| VFX-03 | Phase 3 |
| VFX-04 | Phase 3 |
| VFX-05 | Phase 3 |
| DRS-01 | Phase 3 |
| UI-07 | Phase 3 |

**Total mapped: 36/36**

---

*Roadmap created: 2026-06-26*
*Plans added: 2026-06-26 (Phase 1: 4 plans across 2 waves)*
*Phase 2b added: 2026-06-29 (correction phase — rotating camera + Monaco 3.5x scale)*

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
