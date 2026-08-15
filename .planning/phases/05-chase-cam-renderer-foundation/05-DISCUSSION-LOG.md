# Phase 5: Chase-Cam Renderer Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 5-chase-cam-renderer-foundation
**Areas discussed:** Entrega (harness vs juego real), Mónaco/multiplayer, Estilo visual del placeholder / dirección de arte, Encuadre de cámara, HUD

---

## Entrega: harness de prueba vs. juego real

| Option | Description | Selected |
|--------|-------------|----------|
| Reemplaza el juego real | El botón "jugar" ya muestra la cámara nueva sobre el loop de test | ✓ |
| Harness de test separado | Pantalla de debug aparte, juego real sin tocar hasta que todo esté listo | |

**User's choice:** Reemplaza el juego real
**Notes:** Reforzado más tarde: el usuario pidió explícitamente que haya una "primera versión jugable" al final de esta etapa para validar temprano.

---

## Multiplayer durante Fases 5-9

| Option | Description | Selected |
|--------|-------------|----------|
| Se rompe temporalmente, no importa | Multiplayer no funcional durante 5-9, se arregla en Fase 10 | ✓ |
| Mantener multiplayer en el render viejo | Solo VS CPU usa cámara nueva; multiplayer sigue top-down viejo | |

**User's choice:** Se rompe temporalmente, no importa
**Notes:** El usuario luego pidió explícitamente ("algo que no me gustó...") que ocultemos los botones de multiplayer del lobby en vez de dejarlos visibles y rotos.

### Follow-up: ocultar UI de multiplayer

| Option | Description | Selected |
|--------|-------------|----------|
| Ocultar hasta Fase 10 | Lobby muestra solo VS CPU durante el rewrite | ✓ |
| Dejarlos visibles igual | Botones de crear/unirse sala siguen ahí aunque no funcionen | |

**User's choice:** Ocultar hasta Fase 10

---

## Mónaco se retira

| Option | Description | Selected |
|--------|-------------|----------|
| Mónaco se retira ya | Desde Fase 5 se juega el óvalo simple de test | ✓ |
| Mantener Mónaco hasta Fase 8 | Juego real sigue en Mónaco top-down hasta tener contenido real | |

**User's choice:** Mónaco se retira ya

---

## Estilo visual del placeholder / Dirección de arte

| Option | Description | Selected |
|--------|-------------|----------|
| Reutilizar texturas 4A/4B | Asfalto/pasto pixel-art existente sobre el óvalo simple | ✓ (inicial) |
| Colores planos básicos | Franjas de color sólido, sin texturas | |

**User's choice (inicial):** Reutilizar texturas 4A/4B

**Notes:** El usuario interrumpió con una pieza de visión importante: quiere que el juego sea visualmente atractivo, estilo Silksong (dibujado, atmosférico) — no pixel-art. Esto generó una re-discusión completa de dirección de arte:

### Silksong reemplaza o convive con pixel-art

| Option | Description | Selected |
|--------|-------------|----------|
| Silksong reemplaza el pixel-art | Todo el arte nuevo apunta a dibujado/pintado a mano | ✓ |
| Conviven los dos estilos | Fondos pintados, kart/HUD siguen pixel-art | |

**User's choice:** Silksong reemplaza el pixel-art
**User's rationale (verbatim, traducido):** "Pixel art tenía sentido en 2D, ahora que es más bien 3D me gusta dibujado."

### Placeholder de Fase 5 tras el pivot de arte

| Option | Description | Selected |
|--------|-------------|----------|
| Pixel-art como placeholder funcional | Se usa igual en Fase 5 solo para probar el pipeline, se descarta en Fase 8 | ✓ |
| Mejor colores planos directamente | No reusar pixel-art ni para placeholder | |

**User's choice:** Pixel-art como placeholder funcional

### Mood: técnica vs. tono oscuro de Silksong

| Option | Description | Selected |
|--------|-------------|----------|
| La técnica, no el mood oscuro | Dibujado/pintado con textura, pero paleta luminosa/cálida | ✓ |
| Técnica y mood parecido | Mantener algo del tono atmosférico/dramático | |

**User's choice:** La técnica, no el mood oscuro

### Kart/piloto en la Fase 5

| Option | Description | Selected |
|--------|-------------|----------|
| Silueta simple de placeholder | Rectángulo/silueta básica en 3-5 ángulos | |
| Ya arrancar arte ilustrado | Invertir tiempo en un primer kart dibujado a mano ya | ✓ |

**User's choice:** Ya arrancar arte ilustrado

---

## Encuadre de cámara

| Option | Description | Selected |
|--------|-------------|----------|
| Pegada y agresiva | Cámara baja y cerca, más sensación de velocidad | ✓ |
| Alejada y legible | Cámara más alta/lejos, ves más pista | |

**User's choice:** Pegada y agresiva

---

## HUD durante esta fase

| Option | Description | Selected |
|--------|-------------|----------|
| Adaptar HUD básico ya | Velocidad y vuelta se muestran sobre la vista nueva | ✓ |
| Sin HUD por ahora | Fase 5 es pura cámara/pista, sin overlay | |

**User's choice:** Adaptar HUD básico ya

### Minimapa

| Option | Description | Selected |
|--------|-------------|----------|
| Sacarlo por ahora | No aporta nada con el óvalo de test; vuelve en Fase 8 | ✓ |
| Mantenerlo igual | Dejar el minimapa mostrando el óvalo de test | |

**User's choice:** Sacarlo por ahora

### Estilo visual del resto del HUD

| Option | Description | Selected |
|--------|-------------|----------|
| Mantener estilo actual | HUD sigue Alpine azul/rosa | |
| Empezar a moverlo ya | Ajustar hacia Silksong-style desde esta fase | ✓ |

**User's choice:** Empezar a moverlo ya

---

## Claude's Discretion

- Camera FOV/height/distance numeric tuning (within "tight and aggressive")
- Exact synthetic test loop shape (must include a curve+crest combination)
- Execution approach for the early illustrated kart sprite — rough exploration acceptable
- How much of the HUD gets restyled now vs. left functional-only

## Deferred Ideas

- Real kartodromo content, landmarks, elevation — Phase 8
- Final track/environment art (Silksong-style, non-throwaway) — Phase 8
- Minimap — returns in Phase 8
- Multiplayer payload/rendering fixes — Phase 10
- Full HUD redesign — folds into Phase 8's art pass
- REQUIREMENTS.md ART-01 wording ("pixel-art estilo 4A/4B") needs correction ahead of Phase 8 planning — flagged, not fixed in this discussion
