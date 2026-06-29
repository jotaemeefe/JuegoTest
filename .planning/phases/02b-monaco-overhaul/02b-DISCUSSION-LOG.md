# Phase 2-B Discussion Log

**Date:** 2026-06-29
**Phase:** 2-B Monaco Gameplay Overhaul

---

## Context

El usuario inició esta fase como corrección urgente antes de Fase 3. La motivación: Phase 2 dejó el juego en estado injugable — pista demasiado pequeña, sin radio de giro posible, Monaco no reconocible. El usuario quiere que después de 2-B "el juego sea totalmente otro".

---

## Discussion Areas

### Área 1: Problema core de jugabilidad

**Pregunta:** ¿Cuál es el mayor problema de jugabilidad?
**Opciones:** Pista chica / Controles pesados / Los dos juntos
**Respuesta del usuario:** Los controles / física se sienten pesados y sin respuesta
**Notas:** Interesante — el usuario identificó controles/física como el core, no solo la pista. Esto apunta a que el problema es multidimensional. La decisión de cámara rotatoria resuelve ambas capas: con la cámara fija, el steering se siente raro porque izquierda/derecha en el mundo no coincide con la intuición visual.

### Área 2: Circuito

**Pregunta:** ¿Mantener Monaco o cambiar?
**Respuesta:** Mantener Monaco pero que funcione bien
**Notas:** Monaco es el alma del proyecto. No es negociable.

### Área 3: Cambio clave

**Pregunta:** ¿Cuál sería la mayor mejora?
**Opciones:** Cámara zoom-in / Vista fija rediseñada / Canvas más grande
**Respuesta:** Cámara que sigue al auto (vista zoom-in, como Micro Machines)
**Notas:** Decisión correcta. Es el cambio más impactante posible — transforma completamente la experiencia sin cambiar la mecánica de fondo.

### Área 4: Rotación de cámara

**Pregunta:** ¿La cámara rota con el auto o siempre mira norte?
**Opciones:** Rota con el auto / Norte fijo
**Respuesta:** Rota con el auto — el auto siempre apunta hacia arriba
**Notas:** Confirma la dirección más inmersiva. Izquierda = gira izquierda, derecha = gira derecha, siempre. Sin ambigüedad de controles.

### Área 5: Cantidad de autos

**Pregunta:** 4 autos o simplificar para 2-B?
**Respuesta:** Mantener 4 autos — ya implementado y da drama
**Notas:** Correcto — el cars[] array está funcionando, las colisiones también. No hay razón para hacer regresión.

### Área 6: Escala de Monaco

**Pregunta:** Escala de Monaco
**Opciones:** 3x-4x / 5x+
**Respuesta:** Grande (3x-4x)
**Notas:** 3.5x es el sweet spot. World space ~1600x2000px. Visible en cualquier momento: 480x640 window. Loews a esta escala tiene radio ~280px — navegable a velocidad reducida.

### Área 7: Geometría Monaco

**Pregunta:** Escalar actual x3 vs. redesign desde cero
**Respuesta:** Rediseñar Monaco desde cero
**Notas:** Decisión valiente. El ROAD_SPINE actual tenía problemas de forma más allá del tamaño. El rediseño permite hacer curvas con los radios correctos para la física del juego.

### Área 8: Visuals Monaco

**Pregunta:** Mantener overlay de túnel y color blocks vs. simplificar
**Respuesta:** Simplificar — pista sola, jugabilidad primero
**Notas:** Pragmático. Evita complejidad en la fase de corrección. Los visuals vuelven en Fase 3.

---

## Claude's Discretion Items

- **Suavizado de cámara**: Lerp opcional entre frames para reducir mareo potencial. El agente decide.
- **Cantidad exacta de waypoints AI**: Suficientes para todas las curvas del nuevo Monaco.
- **Padding y estilo del minimap**: Posición, colores, grosor de línea.
- **TURN_RATE exacto**: Investigador debe testar 3.5-4.5 para sensación semi-arcade con cámara rotatoria.

---

## Deferred Ideas

- Overlay de túnel → Fase 3
- Entorno visual Monaco (color blocks) → Fase 3
- AI braking improvements (AI-01) → Fase 3
- Audio improvements → Fase 3
- VFX → Fase 3

---

*Log created: 2026-06-29*
