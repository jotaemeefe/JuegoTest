# Requirements: Colapinto F1 Racer

**Defined:** 2026-06-26
**Core Value:** Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.

## Validated (v1 — existente)

Capacidades ya shiipeadas en v1 que no se tocan en v2:

- ✓ **V1-01**: Modo VS CPU — jugador elige rival de la grilla y corre una carrera completa
- ✓ **V1-02**: Modo multijugador P2P 1v1 vía PeerJS WebRTC con código de sala de 6 caracteres
- ✓ **V1-03**: Renderizado isométrico Canvas 2D top-down con proyección `project(wx, wy)`
- ✓ **V1-04**: Sistema de audio Web Audio API: motor (osciladores), frenos (ruido blanco), colisión
- ✓ **V1-05**: Sistema de checkpoints y vueltas: 4 CPs en orden obligatorio, 3 vueltas totales
- ✓ **V1-06**: Persistencia en localStorage: mejor vuelta personal y resultado por rival
- ✓ **V1-07**: Controles táctiles on-screen para mobile (izquierda / derecha / freno)

---

## v2 Requirements

### Pista — Mónaco

- [ ] **TRACK-01**: Reemplazar el óvalo actual (`ROAD_SPINE`) por el trazado fiel de Mónaco: horquilla Loews, Massenet, Casino, Mirabeau, Rascasse, túnel, chicana del puerto, Swimming Pool
- [ ] **TRACK-02**: Dibujar el entorno del circuito en Canvas 2D con bloques de color que representen: agua del puerto (azul), buildings/casino (gris/blanco), barreras armco (rojo/blanco), asfalto de boxes
- [ ] **TRACK-03**: Implementar overlay del túnel: cuando el auto está en la zona del túnel, se dibuja un polígono oscuro (techo) por encima del auto en el canvas; al salir, el overlay desaparece
- [ ] **TRACK-04**: Actualizar los 4 checkpoints (`CPS`) al nuevo trazado de Mónaco con posiciones relevantes al circuito real

### Múltiples Autos

- [ ] **CARS-01**: Soportar 4 autos simultáneos por carrera: 1 jugador humano + 3 IAs; reemplazar el par fijo `local`/`remote` por un array `cars[]`
- [ ] **CARS-02**: Cada rival IA tiene una personalidad de carrera: *agresivo* (línea ajustada, alta velocidad, más daño en colisiones), *defensivo* (frena más, línea conservadora, menos accidentes), *consistente* (variación mínima, ritmo estable)
- [ ] **CARS-03**: Sistema de colisiones entre los 4 autos: `resolveCarCollision()` extendido para todas las combinaciones de pares
- [ ] **CARS-04**: HUD de posición muestra la clasificación de los 4 autos en tiempo real (P1/P2/P3/P4)

### IA Mejorada

- [ ] **AI-01**: Frenado real de IA: cambiar `BRAKE_FORCE * 0.35` a `BRAKE_FORCE * 0.70` en `updateAI()` (línea ~660) para que los rivales frenen genuinamente antes de curvas
- [ ] **AI-02**: Variación lateral de waypoints: cada waypoint agrega ±5px de offset lateral aleatorio por vuelta; rivales elite (skill ≥ 0.92) con offsets más ajustados
- [ ] **AI-03**: Aplicar personalidad de carrera (CARS-02) al comportamiento de IA: agresivo usa línea interior, defensivo sale amplio en curvas

### Audio

- [ ] **AUDIO-01**: Música de fondo sintetizada vía Web Audio API: loop de acorde de tensión con tempo variable, fade in al inicio de carrera y fade out al terminar
- [ ] **AUDIO-02**: Mejora del sonido de colisión: agregar pitch bend (200Hz→100Hz en 0.4s) sobre el ruido blanco existente
- [ ] **AUDIO-03**: Mejora del tono de motor: oscilación de 2-4 Hz sobre la frecuencia base para que suene más orgánico

### Controles

- [x] **CTRL-01**: Agregar soporte de flechas del teclado (←→ para dirección, ↓ para frenar) además de los controles A/D existentes — verified already implemented in game.js:1054-1056 (01-01)
- [x] **CTRL-02**: Agregar soporte de WASD (A/D dirección, S frenar) si no están ya mapeados — verified already implemented in game.js:1054-1056 (01-01)
- [x] **CTRL-03**: Mapear barra espaciadora como freno adicional — added to keydown/keyup listeners with e.preventDefault() (01-01)

### UI / UX

- [x] **UI-01**: UI completamente responsive: layout se adapta a cualquier tamaño de pantalla; usar `vw/vh` y media queries en lugar de tamaños fijos donde corresponda
- [x] **UI-02**: Fix bug mobile tap: tap en pantalla no selecciona elementos DOM — implementar `user-select: none` + `touch-action: none` en elementos del juego + `preventDefault()` en todos los handlers touch
- [x] **UI-03**: Canvas con `devicePixelRatio`: `canvas.width = 480 * dpr`, `canvas.height = 640 * dpr`, `ctx.scale(dpr, dpr)` para renderizado nítido en Retina y móviles de alta densidad
- [x] **UI-04**: Rival select en mobile (< 500px ancho): cambiar grid de 2 columnas a carousel o lista vertical con tarjeta grande del rival actual + botones siguiente/anterior
- [ ] **UI-05**: Botón "Copiar código" en pantalla de sala multiplayer con toast de confirmación "¡Copiado!" por 1.5s
- [ ] **UI-06**: Modal de desconexión: reemplazar `alert('El rival se desconectó...')` por modal in-game con auto-redirect a lobby en 3s sin bloquear el thread
- [ ] **UI-07**: Rediseño visual de las pantallas lobby, rival select y resultados: tipografía más impactante, mejor uso del color Alpine (azul/rosa), animaciones de entrada de pantalla

### Feedback Visual

- [ ] **VFX-01**: Feedback de daño progresivo: overlay de tinte de pantalla (sin tinte → tinte naranja → tinte rojo intenso) que se intensifica con el nivel de daño del auto
- [ ] **VFX-02**: Screen shake en colisión grave (daño > 30 en un impacto): canvas vibra 200ms con offset de ±4px
- [ ] **VFX-03**: Drama de overtake: al superar un rival, flash rojo en el auto superado + pausa de 0.3s + tono sintetizado ascendente; al ser superado, flash azul en el propio auto
- [ ] **VFX-04**: Feedback mid-carrera en cruce de meta: mostrar tiempo de la vuelta completada vs récord personal (ej: "1:23.4 (+0.8s récord)" o "RÉCORD PERSONAL! -0.3s" en gold)
- [ ] **VFX-05**: Pantalla de resultados siempre muestra mejor vuelta (con placeholder "--:--" si no hay registro aún)

### Grilla 2026

- [x] **GRID-01**: Actualizar el array `RIVALS` con los 21 pilotos de la temporada 2026 de F1: nombres, equipos, números de auto y valores de skill ajustados al rendimiento actual de cada piloto (01-01)
- [x] **GRID-02**: Actualizar colores de equipo (`body`, `accent`) en el array `RIVALS` para reflejar las libreas 2026 de cada equipo — Audi updated from Kick Sauber green; Cadillac colors [ASSUMED] (01-01)

### Bug Fixes

- [x] **BUG-01**: Eliminar el `resetGame()` duplicado en `btn-restart` del host (línea ~1212) — fixed (01-01)
- [x] **BUG-02**: Agregar guard de vueltas en el guest al recibir mensaje `finish`: `if (remote.lap < TOTAL_LAPS - 1) return;` — verified already present and symmetric (01-01)
- [x] **BUG-03**: Consolidar la lambda `cpScore` duplicada en `updateHUD()` (líneas 673 y 682) en una única definición al inicio de la función — duplicate removed (01-01)
- [x] **BUG-04**: Fix bug del lap timer: `lapStartTime` debe inicializarse en el momento en que arranca la carrera — verified correctly set at line 820 (01-01)

---

## Out of Scope (v2)

| Feature | Razón |
|---------|-------|
| Multijugador de 4 humanos via PeerJS | Requiere arquitectura de red mesh completa — v3+ |
| Pixel art sprites / imágenes externas | Mantener puro Canvas 2D; sin overhead de assets |
| Inclinómetro (steering por acelerómetro) | Nice-to-have, complejidad media, v3 |
| Selector de pistas múltiples | Mónaco reemplaza el óvalo; selector es v3 |
| Replay / ghost car | Alta complejidad de estado, v3 |
| Tabla de clasificación online | Requiere backend, fuera del stack estático |
| Track pre-render a OffscreenCanvas | Optimización de performance, v3 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Pending |
| BUG-02 | Phase 1 | Pending |
| BUG-03 | Phase 1 | Pending |
| BUG-04 | Phase 1 | Pending |
| CTRL-01 | Phase 1 | Pending |
| CTRL-02 | Phase 1 | Pending |
| CTRL-03 | Phase 1 | Pending |
| GRID-01 | Phase 1 | Pending |
| GRID-02 | Phase 1 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 1 | Complete |
| UI-05 | Phase 1 | Pending |
| UI-06 | Phase 1 | Pending |
| TRACK-01 | Phase 2 | Pending |
| TRACK-02 | Phase 2 | Pending |
| TRACK-03 | Phase 2 | Pending |
| TRACK-04 | Phase 2 | Pending |
| CARS-01 | Phase 2 | Pending |
| CARS-02 | Phase 2 | Pending |
| CARS-03 | Phase 2 | Pending |
| CARS-04 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AUDIO-01 | Phase 3 | Pending |
| AUDIO-02 | Phase 3 | Pending |
| AUDIO-03 | Phase 3 | Pending |
| VFX-01 | Phase 3 | Pending |
| VFX-02 | Phase 3 | Pending |
| VFX-03 | Phase 3 | Pending |
| VFX-04 | Phase 3 | Pending |
| VFX-05 | Phase 3 | Pending |
| UI-07 | Phase 3 | Pending |

**Coverage:**
- v2 requirements: 35 total
- Mapped to phases: 35 / 35
- Unmapped: 0

---
*Requirements defined: 2026-06-26*
*Last updated: 2026-06-26 after v2.0 roadmap creation*
