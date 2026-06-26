---
name: vision-ios-android-app
description: Visión a largo plazo de convertir el juego en una app nativa iOS/Android con multiplayer real
metadata:
  type: note
date: 2026-06-26
context: exploración de Release 3 — idea que emergió pero está fuera del scope inmediato
---

# Nota: Visión a largo plazo — iOS/Android app

## La idea

A largo plazo (post-Release 3 o más), el juego evoluciona de web browser a app nativa para iOS/Android. El salto justificaría multiplayer real con matchmaking, notificaciones push, y una experiencia mobile-first.

## Por qué es importante registrar esto ahora

Decisiones de arquitectura en Release 3 pueden facilitar o dificultar esta transición. Vale la pena mantener en mente:
- Evitar APIs browser-only sin fallback (Web Audio API → considerar alternativas nativas)
- Mantener la lógica de juego separada del rendering DOM
- El sistema de temporada/localStorage debería poder migrarse a un backend cuando llegue el momento

## Lo que NO es

- No está en scope de Release 3
- No es un plan concreto — es una dirección intencional
- No implica reescribir nada en v2/v3

## Cuándo revisitar

Cuando el juego web tenga el modo temporada completo y haya tracción real de usuarios. Ese es el momento de evaluar si el salto a app nativa tiene sentido económico y de esfuerzo.

## Relacionado

- [[championship-season-mode]] — Release 3, el paso previo necesario
