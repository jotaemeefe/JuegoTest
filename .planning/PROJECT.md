# Colapinto F1 Racer

## What This Is

Un juego de carreras F1 2D top-down en el browser, temático de Franco Colapinto y Alpine. El jugador elige un rival de la grilla real de F1 y compite en un circuito de carreras. Dos modos: VS CPU (solo vs IA) y multijugador P2P vía PeerJS WebRTC. Tecnología: HTML/CSS/JS vanilla puro, sin build tools ni dependencias externas salvo PeerJS CDN.

## Core Value

Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.

## Requirements

### Validated

<!-- Existente en v1 — funciona y está shiipped. -->

- ✓ Modo VS CPU: jugador elige un rival de la grilla y corre una carrera — v1
- ✓ Modo multijugador P2P 1v1 vía PeerJS WebRTC con código de sala de 6 caracteres — v1
- ✓ Renderizado isométrico Canvas 2D con proyección top-down — v1
- ✓ Sistema de audio: tono de motor (osciladores Web Audio), chirrido de frenos, sonido de colisión — v1
- ✓ Sistema de checkpoints y vueltas (4 CPs, 3 vueltas), detección de orden obligatorio — v1
- ✓ Persistencia en localStorage: mejor vuelta personal y resultado por rival — v1
- ✓ Controles táctiles on-screen para mobile (izquierda / derecha / freno) — v1
- ✓ 20 rivales de F1 con skill individualizado (escala velocidad máxima de IA) — v1
- ✓ Controles expandidos: flechas + WASD + barra espaciadora para frenar — Phase 1
- ✓ UI responsive: escala correctamente en cualquier pantalla; canvas con devicePixelRatio para nitidez en Retina/móvil — Phase 1
- ✓ Fix bug mobile tap: el tap no selecciona elementos DOM — Phase 1
- ✓ Rival select en mobile: layout carousel en pantallas < 500px ancho — Phase 1
- ✓ Botón "Copiar código" en sala multiplayer — Phase 1
- ✓ Modal de desconexión (reemplaza `alert()`) con auto-redirect a lobby — Phase 1
- ✓ Grilla 2026 completa: 21 rivales con equipos, números y nombres correctos — Phase 1

### Active

<!-- Scope de v2.0 — próximo release. -->

- [ ] Circuito de Mónaco: trazado fiel (horquilla Loews, túnel, chicana del puerto) con entorno en bloques de color Canvas 2D
- [ ] Túnel de Mónaco: overlay oscuro sobre el auto al entrar, polygon del techo sobre el canvas
- [ ] 4 autos por carrera: 1 jugador humano + 3 IAs con personalidades distintas (agresivo, defensivo, consistente)
- [ ] IA mejorada: frenado real antes de curvas (70% de la fuerza del jugador), variación lateral en waypoints, línea de carrera diferenciada por personalidad
- [ ] Música de fondo sintetizada vía Web Audio API
- [ ] Controles expandidos: flechas + WASD + barra espaciadora para frenar
- [ ] UI responsive: escala correctamente en cualquier pantalla; canvas con devicePixelRatio para nitidez en Retina/móvil
- [ ] Fix bug mobile tap: el tap no selecciona elementos DOM — `user-select: none` + `touch-action: none` + `preventDefault()` en handlers touch
- [ ] Rival select en mobile: layout carousel en pantallas < 500px ancho
- [ ] Feedback visual de daño: tinte de pantalla (verde→naranja→rojo) + screen shake en colisión grave
- [ ] Drama de overtake: flash del auto superado, pausa 0.3s, tono sintetizado
- [ ] Feedback mid-carrera: diferencia de tiempo vs récord personal en cada cruce de meta
- [ ] Botón "Copiar código" en sala multiplayer
- [ ] Modal de desconexión (reemplaza `alert()`) con auto-redirect a lobby
- [ ] Grilla 2026 completa: actualizar los 20 pilotos a la temporada actual con equipos, números y nombres correctos
- [ ] Rediseño visual general de pantallas (lobby, rival select, resultados)

### Out of Scope

- Multijugador de 4 jugadores humanos — cambio arquitectural demasiado grande, v3+
- Pixel art sprites / archivos de imagen externos — mantener todo en Canvas 2D puro
- Inclinómetro (steering por acelerómetro) — nice-to-have, v3
- Más de un circuito disponible — Mónaco reemplaza el óvalo actual en v2; selector de pistas es v3
- Server-side / backend — el juego es y sigue siendo estático

## Context

- **Stack**: HTML/CSS/JS vanilla, Canvas 2D, Web Audio API, PeerJS 1.5.4 CDN. Sin bundler, sin npm.
- **Archivo principal**: `game.js` (~1281 líneas), una sola función de game loop con estado en variables de módulo.
- **Proyección isométrica**: `project(wx, wy)` en `game.js:344` — todas las posiciones de track y autos pasan por acá.
- **Trazado actual**: `ROAD_SPINE` (35 puntos) en `game.js:24-37`. Para Mónaco se reemplaza completo.
- **IA actual**: 18 waypoints en óvalo (`AI_WAYPOINTS`), skill lineal (0.79–0.96), nunca frena fuerte (`BRAKE_FORCE * 0.35`).
- **Audio**: lazy-init en primer gesto del usuario (requisito iOS/Safari, `game.js:240`).
- **Codebase mapeado**: `.planning/codebase/` contiene análisis completo de arquitectura, stack y concerns.

## Constraints

- **Tech stack**: Vanilla JS — sin frameworks, sin bundler, sin package.json. Cualquier feature nueva debe funcionar como `<script>` en `index.html` o inline en `game.js`.
- **Sin archivos de imagen**: El entorno de Mónaco se dibuja 100% en Canvas 2D (formas y colores). No hay assets PNG/SVG.
- **Compatibilidad**: Debe correr en cualquier browser moderno con Canvas 2D + Web Audio API + WebRTC. iOS/Safari incluido.
- **Sin servidor**: Hosting estático puro. PeerJS usa su propio signaling server CDN.
- **Grilla 2026**: Los 20 pilotos deben ser verificados por el usuario durante la implementación — el knowledge cutoff del agente es agosto 2025.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 4 autos = 1 jugador + 3 IAs (no 4 humanos) | Multiplayer mesh de 4 es un rediseño de red completo; 3 IAs agrega drama sin complejidad de red | — Pending |
| Mónaco reemplaza el óvalo (no hay selector de pistas) | Un circuito excelente > dos circuitos mediocres; selector de pistas es v3 | — Pending |
| Entorno en Canvas 2D color blocks (no sprites) | Coherente con stack actual; sin overhead de assets; estilo visual propio del juego | — Pending |
| Túnel: overlay polygon sobre el auto | Simple, efectivo, no requiere infraestructura nueva | — Pending |
| Música: Web Audio API sintetizada | Sin archivos externos, consistente con engine audio existente | — Pending |

## Evolution

Este documento evoluciona en cada transición de fase.

**Después de cada fase** (vía `/gsd:discuss-phase`):
1. ¿Requisitos invalidados? → Mover a Out of Scope con razón
2. ¿Requisitos validados/shiippeados? → Mover a Validated con referencia de fase
3. ¿Requisitos nuevos emergieron? → Agregar a Active
4. ¿Decisiones para loguear? → Agregar a Key Decisions
5. ¿"What This Is" sigue siendo preciso? → Actualizar si drifteó

---
*Last updated: 2026-06-26 — Phase 1 Foundation complete*
