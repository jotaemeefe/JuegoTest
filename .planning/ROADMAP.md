# Roadmap: Colapinto F1 Racer v2.0

**Project:** Colapinto F1 Racer
**Milestone:** v2.0
**Phases:** 3
**Requirements:** 35 v2 requirements

---

## Phases

- [ ] **Phase 1: Foundation** — Bug fixes, expanded controls, 2026 grid, and responsive UI. No architecture changes — immediate playability improvements on the existing oval.
- [ ] **Phase 2: Monaco + 4 Cars** — Replace the oval with the Monaco circuit and refactor the car system to support 4 simultaneous cars (1 player + 3 AI). The two largest structural changes in v2.
- [ ] **Phase 3: AI, Audio & Polish** — Improved AI with real braking and personalities, background music, audio enhancements, visual feedback effects, and UI redesign.

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
**Plans:** 3/4 plans executed
Plans:
- [x] 01-01-PLAN.md — Bug fixes (BUG-01–04), spacebar brake (CTRL-03), 2026 RIVALS array (GRID-01, GRID-02)
- [x] 01-02-PLAN.md — Responsive layout verification (UI-01), mobile text-select fix (UI-02), DPR canvas scaling (UI-03)
- [x] 01-03-PLAN.md — Mobile rival carousel prev/next (UI-04)
- [ ] 01-04-PLAN.md — Copy room code button + toast (UI-05), disconnect modal (UI-06)
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
**Plans:** TBD

### Phase 3: AI, Audio & Polish
**Goal:** Racing feels tense and dramatic: AI opponents brake for corners and have distinct driving personalities, background music builds atmosphere, and visual effects celebrate overtakes and communicate damage.
**Depends on:** Phase 2
**Requirements:** AI-01, AI-02, AI-03, AUDIO-01, AUDIO-02, AUDIO-03, VFX-01, VFX-02, VFX-03, VFX-04, VFX-05, UI-07
**Success Criteria:**
1. AI cars visibly slow down before tight corners (Loews, Rascasse) and their lines vary lap-to-lap; the aggressive AI takes tighter lines than the defensive AI.
2. Background music plays during the race and fades out when the checkered flag falls.
3. When the player's car takes heavy damage, the screen tints progressively from orange to red and shakes noticeably on hard impacts.
4. Overtaking a rival triggers a visible flash on the passed car and a rising synth tone; being overtaken triggers a flash on the player's car.
5. After each lap crossing, the player sees their lap time compared to their personal best ("1:23.4 +0.8s récord" or "RÉCORD PERSONAL! -0.3s" in gold). The results screen always shows the best lap with a "--:--" placeholder if no lap has been completed.
6. The lobby, rival select, and results screens have an updated visual design with impactful typography and Alpine brand colors (blue/pink).
**Plans:** TBD
**UI hint:** yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | In Progress|  |
| 2. Monaco + 4 Cars | 0/? | Not started | - |
| 3. AI, Audio & Polish | 0/? | Not started | - |

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
| TRACK-01 | Phase 2 |
| TRACK-02 | Phase 2 |
| TRACK-03 | Phase 2 |
| TRACK-04 | Phase 2 |
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
| UI-07 | Phase 3 |

**Total mapped: 35/35**

---

*Roadmap created: 2026-06-26*
*Plans added: 2026-06-26 (Phase 1: 4 plans across 2 waves)*

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
