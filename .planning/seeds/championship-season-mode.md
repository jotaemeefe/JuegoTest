---
name: championship-season-mode
description: Modo temporada F1 completo con puntos, tabla y múltiples circuitos — Release 3 core feature
metadata:
  type: seed
trigger_condition: cuando v2.0 esté completo y las 3 fases del roadmap actual estén en estado done
planted_date: 2026-06-26
---

# Seed: Championship Season Mode

## La idea

Después de v2.0, ganar una carrera no tiene consecuencias. Este seed planta el siguiente salto grande: un modo temporada F1 que le da al juego una razón para volver cada día.

## Visión

El jugador disputa una temporada completa contra los 20 pilotos del grid. Cada carrera otorga puntos (sistema F1: 25-18-15-12-10-8-6-4-2-1). Al final de la temporada, hay un campeón.

## Circuitos

5-6 pistas icónicas además de Monaco (ya incluida en v2.0):
- Monza (alta velocidad, slipstream)
- Silverstone (alto downforce, curvas rápidas)
- Spa-Francorchamps (variación climática, Eau Rouge)
- Suzuka (técnico, figura 8)
- Interlagos (favorito de la afición, posibilidad lluvia)

El trabajo pesado por pista: geometría canvas, AI waypoints (~18 puntos), visuales de color blocks.

## Mecánicas clave

- **Calendario:** 6 carreras, orden fijo o aleatorio
- **Tabla de posiciones:** live standings entre carreras
- **Grid de salida:** determinado por resultado de clasificación o resultado anterior
- **Estado persistente:** temporada guardada en localStorage (no se pierde al cerrar)
- **Fin de temporada:** pantalla de campeón, reset o nueva temporada

## Modo

Solo vs CPU — los 20 pilotos IA participan en cada carrera y acumulan puntos propios.
Multiplayer NO está en scope de Release 3.

## Por qué este es el salto correcto

v1 → v2: mejora estructural (Monaco, 4 autos, IA real, polish)
v2 → v3: meta-loop (razón para volver, narrativa de campaña, identidad del jugador como piloto)

## Relacionado

- [[vision-ios-android-app]] — horizonte futuro del proyecto
