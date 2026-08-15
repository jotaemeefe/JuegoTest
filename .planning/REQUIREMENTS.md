# Requirements: Colapinto Kart Racer — v3.0 Arcade Rebirth

**Defined:** 2026-08-15
**Core Value (this milestone):** Un kart de carreras F1/Colapinto se siente rápido y satisfactorio en tercera persona, en un kartódromo con identidad propia — reemplazando el sistema top-down actual, que no divierte y no tiene nicho claro.

**Theme:** Franco Colapinto joven, corriendo karting en Argentina, antes de irse a Italia por Fórmula 4. La capa narrativa/biográfica completa queda fuera de este milestone (ver Out of Scope) — acá solo se construye el núcleo de manejo/cámara/pista.

---

## v3.0 Requirements

### Renderer

- [ ] **RENDER-01**: Motor de render pseudo-3D en tercera persona (cámara detrás del kart) reemplaza el render top-down actual — técnica Canvas 2D de "road segments" (proyección por segmento, curvas + elevación), sin WebGL/Three.js
- [ ] **RENDER-02**: Sensación de velocidad: scroll de segmentos a distancia constante, rumble strips alternados, shake/FOV en velocidad alta, escalado de pitch de audio
- [ ] **RENDER-03**: Caso de test dedicado para curva+cresta combinadas antes de autorar contenido real de pista (evita el bug clásico de proyección rota)
- [ ] **RENDER-04**: Culling de distancia de dibujo (~100-120 segmentos) y perfilado en hardware mobile real (iOS Safari, Android gama media) desde la fase de renderer, no al final

### Manejo (Drift)

- [ ] **DRIFT-01**: Máquina de estados de derrape (iniciar / mantener ángulo / cargar / boost de liberación por nivel), tuneada en un harness de prueba aislado antes de integrarla a la pista real
- [ ] **DRIFT-02**: Feel de manejo "grounded" tipo kart real (más mecánico, menos flotante que Mario Kart) — hipótesis a validar con playtest, no un spec cerrado
- [ ] **DRIFT-03**: Estado del auto pasa de coordenadas world (x, y, angle) a espacio de pista (distancia recorrida, offset lateral)

### IA

- [ ] **AI-01**: IA portada al nuevo modelo de coordenadas de pista, con la misma capacidad de derrape que el jugador (evita que el jugador derrape y la IA parezca "sobre rieles")
- [ ] **AI-02**: Racecraft existente preservado en el nuevo modelo: avoidance predictivo, bloqueo defensivo, rubber-band, errores de presión por personalidad

### Pista y arte

- [ ] **TRACK-01**: Tabla de segmentos densa (`SEGMENTS[]`: curvatura, elevación, ancho, color por segmento) reemplaza el `ROAD_SPINE` disperso actual
- [ ] **TRACK-02**: Un kartódromo real, completo y jugable, con cambios de elevación y 2-3 landmarks reconocibles — resuelve el problema de "pistas vacías/genéricas"
- [ ] **ART-01**: Sprites nuevos del kart/piloto vistos desde atrás en 3-5 ángulos de giro (reemplaza el sprite rotable top-down), mismo estilo pixel-art que 4A/4B

### Progresión

- [ ] **PROGRESS-01**: Mejor vuelta personal persistida por pista (extiende el patrón `cr_best_lap_ms` existente)
- [ ] **PROGRESS-02**: Auto fantasma (ghost): graba y reproduce tu mejor vuelta como sprite translúcido no-colisionable
- [ ] **PROGRESS-03**: Rank/grading de vuelta contra umbrales de tiempo (ej. bronce/plata/oro)

### Multiplayer

- [ ] **MP-01**: Payload `pos` actualizado de `{x, y, angle, speed, lap, cp}` a `{trackDistance, lateralOffset, speed, driftState}`
- [ ] **MP-02**: `remoteRenderPos()` actualizado para interpolar/proyectar el auto remoto en el nuevo modelo de coordenadas

### Mobile / Regresión

- [ ] **MOBILE-01**: Re-verificación end-to-end de los fixes mobile/iOS existentes (`AudioContext` lazy-init, Pointer Events touch, `devicePixelRatio`, viewport-fit) contra el rewrite completo
- [ ] **MOBILE-02**: `tests/` extendido con smoke tests y capturas de referencia para el chase-cam, HUD y controles nuevos

---

## Out of Scope (v3.0)

| Feature | Razón |
|---------|-------|
| Tramos punto-a-punto con bifurcaciones | Formato descartado a favor de kartódromo cerrado (más fiel al karting real; evita la mayor categoría de riesgo técnico) |
| Capa narrativa (kartódromos reales de Argentina, progresión biográfica hacia el llamado a Italia/F4) | Reservada para un release futuro ("Colapinto Story"); este milestone es solo el núcleo de manejo/cámara/pista |
| Power-ups / combate | Mario Kart es referencia de cámara/manejo únicamente, no de caos — sigue siendo una carrera de habilidad pura |
| DRS | No tiene justificación en un kartódromo real (sin alerones); el único boost de este release es el de derrape |
| Campaña de stages / desbloqueos / múltiples pistas | Depende de un concepto de campaña que no existe en este milestone (una sola pista) |
| Niveles de boost de derrape más allá de uno | Se valida un nivel antes de agregar más |

---

## Traceability

| Requirement | Phase |
|-------------|-------|
| RENDER-01 | Phase 5 |
| RENDER-02 | Phase 5 |
| RENDER-03 | Phase 5 |
| RENDER-04 | Phase 5 |
| DRIFT-01 | Phase 6 |
| DRIFT-02 | Phase 6 |
| DRIFT-03 | Phase 6 |
| AI-01 | Phase 7 |
| AI-02 | Phase 7 |
| TRACK-01 | Phase 8 |
| TRACK-02 | Phase 8 |
| ART-01 | Phase 8 |
| PROGRESS-01 | Phase 9 |
| PROGRESS-02 | Phase 9 |
| PROGRESS-03 | Phase 9 |
| MP-01 | Phase 10 |
| MP-02 | Phase 10 |
| MOBILE-01 | Phase 11 |
| MOBILE-02 | Phase 11 |

**Coverage:**
- v3.0 requirements: 19 total
- Mapped to phases: 19 / 19 ✓

---
*Requirements defined: 2026-08-15*
*Research: `.planning/research/SUMMARY.md` (STACK, FEATURES, ARCHITECTURE, PITFALLS)*
*Roadmap: `.planning/ROADMAP.md` (Phases 5-11)*
