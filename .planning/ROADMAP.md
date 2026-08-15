# Roadmap: Colapinto F1 Racer

## Milestones

- ✅ **v2.0 Colapinto F1 Racer** — Phases 1-4B (shipped 2026-08-15)

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

## Progress

| Milestone | Phases | Status | Completed |
|-----------|--------|--------|-----------|
| v2.0 Colapinto F1 Racer | 1-4B (8 phases) | Shipped | 2026-08-15 |

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
