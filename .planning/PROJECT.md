# Colapinto F1 Racer

## What This Is

Un juego de carreras F1 2D top-down en el browser, temático de Franco Colapinto y Alpine. Dos modos: VS CPU — ahora un **Grand Prix de 22 autos** (jugador + toda la grilla de rivales, arranque P12, 5 vueltas) además de un Duelo 1v1 con selección de rival — y multijugador P2P 1v1 vía PeerJS WebRTC. El circuito es Mónaco, rediseñado como trazado no-cruzado a escala 135% para carreras de pelotón. Renderizado con una pipeline nativa de tiles/paleta pixel-art (16 celdas) sobre Canvas 2D. Tecnología: HTML/CSS/JS vanilla puro, sin build tools ni dependencias externas salvo PeerJS CDN.

## Core Value

Una carrera tensa y satisfactoria contra rivales con personalidad propia (o contra la grilla completa en el Grand Prix), en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.

*Este Core Value describe lo shippeado en v2.0. El milestone v3.0 en curso lo reemplaza — ver abajo.*

## Current Milestone: v3.0 Arcade Rebirth

**Goal:** Reconstruir el juego como un arcade racer F1 en tercera persona — cámara detrás del auto, look pseudo-3D, manejo de derrape ajustado tipo kart — reemplazando por completo el sistema top-down de vueltas en Mónaco porque el juego actual no es divertido y no tiene un nicho claro.

**Target features:**
- Cámara y manejo arcade detrás del auto (no top-down, no simulación realista)
- Estructura de tramos punto-a-punto con bifurcaciones, reemplazando el circuito cerrado
- Diseño de pista con identidad — saltos, curvas únicas, sensación de lugar
- Loop de progresión/meta repensado desde cero para este formato (motivo para volver a jugar)
- Sin power-ups/combate — sigue siendo carrera F1, no caos tipo Mario Kart
- Reemplaza VS CPU, Grand Prix y multiplayer — no convive con el sistema top-down

**Key context:** El trabajo de 4A/4B (tileset pixel-art, Mónaco 135%, Grand Prix de 22 autos) queda retirado como núcleo del juego — la mecánica de pista cambia de raíz. Ver Key Decisions para el detalle.

## Requirements

### Validated

<!-- Shippeado y funcionando. -->

- ✓ Modo VS CPU: Duelo 1v1 con selección de rival — v1
- ✓ Modo multijugador P2P 1v1 vía PeerJS WebRTC con código de sala de 6 caracteres — v1
- ✓ Renderizado top-down Canvas 2D — v1
- ✓ Sistema de audio: tono de motor (osciladores Web Audio), chirrido de frenos, sonido de colisión — v1
- ✓ Persistencia en localStorage: mejor vuelta personal y resultado por rival — v1
- ✓ Controles táctiles on-screen para mobile (izquierda / derecha / freno) — v1
- ✓ Controles expandidos: flechas + WASD + barra espaciadora para frenar — Phase 1
- ✓ UI responsive con devicePixelRatio; carousel de rivales en mobile < 500px — Phase 1
- ✓ Botón "Copiar código" + modal de desconexión (reemplaza `alert()`) en sala multiplayer — Phase 1
- ✓ Grilla 2026 completa: 21 rivales con equipos, números y colores correctos — Phase 1
- ✓ Circuito de Mónaco fiel, no-cruzado (57-pt spine), con entorno canvas y overlay de túnel — Phase 2 / 2b / 2c
- ✓ Cámara rotativa que sigue al auto (siempre apunta arriba) + minimapa — Phase 2b
- ✓ Múltiples autos con personalidades (agresivo/defensivo/consistente) y colisión entre todos los pares — Phase 2 (ampliado a 22 autos en 4A)
- ✓ IA con frenado real de curva, avoidance predictivo de tráfico, bloqueo defensivo, rubber-band y errores de presión visibles — Phase 3 / 3b
- ✓ Física de aproximación exponencial a velocidad tope (caps reales, sin terminal velocity fantasma) — Phase 3b
- ✓ Colisiones bump-and-run (deslizan, no pegan) y wall-grinding vs. penalización de choque cuadrado — Phase 3b
- ✓ Línea de meta real (cruce de segmento) y progreso continuo de carrera (ranking, gaps en segundos reales, overtakes honestos) — Phase 3b
- ✓ Música de fondo sintetizada + feedback visual de daño (tinte progresivo, screen shake) + flash de overtake — Phase 3
- ✓ DRS: detección a ≤1s en meta, una activación por vuelta en la recta principal, compartido jugador/IA — Phase 3 (rediseñado en 4B)
- ✓ Rediseño visual Alpine azul+rosa (lobby, selección, resultados) — Phase 3
- ✓ Grand Prix de 22 autos: jugador + grilla completa, arranque P12, 5 vueltas, circuito 135% más ancho para carreras de pelotón — Phase 4A
- ✓ Pipeline de render pixel-art nativa (tileset de 16 celdas, quantización de paleta) — Phase 4A
- ✓ Composición de escena intencional (props/crowds únicos, solo texturas repiten) + score de manejo limpio — Phase 4B

### Active

<!-- Scope de v3.0 — a definir en detalle vía REQUIREMENTS.md. -->

- [ ] Cámara y manejo arcade en tercera persona (detrás del auto), look pseudo-3D
- [ ] Tramos punto-a-punto con bifurcaciones (reemplaza el circuito cerrado de vueltas)
- [ ] Diseño de pista con identidad: saltos, curvas únicas, sensación de lugar
- [ ] Loop de progresión/meta nuevo (motivo para volver a jugar)

### Out of Scope

- Multijugador de 4+ jugadores humanos — cambio arquitectural demasiado grande
- Inclinómetro (steering por acelerómetro) — nice-to-have, futuro
- Power-ups / combate (proyectiles, ítems tipo Mario Kart) — se toma la cámara/manejo de Mario Kart como referencia, no el caos de combate; sigue siendo una carrera F1
- Circuito cerrado de Mónaco como núcleo del juego — retirado en v3.0 a favor de tramos punto-a-punto (el asset/código puede reutilizarse pero no es el formato principal)
- Replay / ghost car — alta complejidad de estado
- Tabla de clasificación online / backend — el juego es y sigue siendo estático

## Context

- **Stack**: HTML/CSS/JS vanilla, Canvas 2D, Web Audio API, PeerJS 1.5.4 CDN. Sin bundler, sin npm. `game.js` ~2691 líneas.
- **Assets**: `assets/r4a-tileset.png` (tileset de 16 celdas) y `assets/r4b-crowd.png` (sprite sheet de crowd con alpha) — el juego ya no es 100% Canvas 2D sin imágenes; esa restricción de v1/v2 quedó invalidada en 4A/4B.
- **Tests**: `tests/` contiene smoke tests automatizados (`r4a-smoke.test.js`, `r4b-release.test.js`) y capturas de referencia (desktop/mobile/DRS).
- **Circuito**: `ROAD_SPINE` (57 puntos, 1600×2000 world space, escalado 135% en 4A), no-cruzado por diseño (Mónaco real es 3D y se autocruza en 2D).
- **Física**: modelo de aproximación exponencial a velocidad tope (`ACCEL_RATE`), reemplazó el modelo de fricción constante que tenía un terminal velocity bug.
- **IA**: `AI_WAYPOINTS` (55 puntos) + personalidades + avoidance/bloqueo/rubber-band/pressure mistakes.
- **Audio**: lazy-init en primer gesto del usuario (requisito iOS/Safari).
- **Codebase mapeado**: `.planning/codebase/` contiene análisis de arquitectura, stack y concerns (puede estar desactualizado post-4A/4B — revalidar si se usa).
- **Nota de proceso**: Phases 4A y 4B se documentaron con el patrón propio del proyecto (`PLAN.md` + `RELEASE.md`, ver CLAUDE.md) en lugar del patrón estándar GSD (`SUMMARY.md`); están completas y verificadas pero no aparecen en el tracking estándar de GSD sin este ajuste manual.

## Constraints

- **Tech stack**: Vanilla JS — sin frameworks, sin bundler, sin package.json. Cualquier feature nueva debe funcionar como `<script>` en `index.html` o inline en `game.js`.
- **Compatibilidad**: Debe correr en cualquier browser moderno con Canvas 2D + Web Audio API + WebRTC. iOS/Safari incluido.
- **Sin servidor**: Hosting estático puro. PeerJS usa su propio signaling server CDN.
- **Multiplayer sigue siendo 1v1**: el Grand Prix de 22 autos es exclusivo de VS CPU; el modo P2P no escaló con 4A/4B.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 4 autos = 1 jugador + 3 IAs (no 4 humanos) | Multiplayer mesh de 4 es un rediseño de red completo; IAs agregan drama sin complejidad de red | ✓ Shippeado, luego superado por el Grand Prix de 22 (solo IA) |
| Mónaco reemplaza el óvalo (no hay selector de pistas) | Un circuito excelente > dos circuitos mediocres | ✓ Shippeado |
| Modelo de física exponencial reemplaza fricción constante | El modelo anterior tenía terminal velocity de 364px/s, por debajo de todos los caps — los multiplicadores eran decorativos | ✓ Shippeado, caps ahora reales |
| DRS reemplaza al experimento de nitro (03b-04) | Nitro rompía el ritmo arcade; DRS da un mecanismo de ataque legible y familiar para fans de F1 | ✓ Shippeado en 4B |
| Pixel-art nativo (tileset + paleta) reemplaza Canvas 2D color blocks | La restricción "sin imágenes" de v1 limitaba la identidad visual; un pipeline de tiles da más presencia sin salir de Canvas 2D en runtime | ✓ Shippeado en 4A, invalida la restricción original de "sin assets" |
| Grand Prix de 22 autos en vez de escalar el 1v1 | El 1v1 se sentía vacío; un pelotón completo da drama real de carrera | ✓ Shippeado en 4A |

## Evolution

Este documento evoluciona en cada transición de fase y en cada cierre de milestone.

**Después de cada fase** (vía `/gsd:discuss-phase`):
1. ¿Requisitos invalidados? → Mover a Out of Scope con razón
2. ¿Requisitos validados/shiippeados? → Mover a Validated con referencia de fase
3. ¿Requisitos nuevos emergieron? → Agregar a Active
4. ¿Decisiones para loguear? → Agregar a Key Decisions
5. ¿"What This Is" sigue siendo preciso? → Actualizar si drifteó

**Después de cada milestone** (vía `/gsd:complete-milestone`):
1. Revisión completa de todas las secciones
2. Chequeo de Core Value — ¿sigue siendo la prioridad correcta?
3. Auditoría de Out of Scope — ¿las razones siguen siendo válidas?
4. Actualizar Context con el estado actual

---
*Last updated: 2026-08-15 — v2.0 milestone complete (Phases 1–4B)*
