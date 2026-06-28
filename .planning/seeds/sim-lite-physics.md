---
name: sim-lite-physics
description: Físicas sim-lite con traction limit, penalidades de pista, setup pre-carrera e IA adaptativa — Release 5
metadata:
  type: seed
trigger_condition: cuando Release 4 (Race Strategy & Drama) esté completo
planted_date: 2026-06-27
---

# Seed: Sim-Lite Physics & Challenge

## El problema que resuelve

Después de R4, el juego tiene profundidad estratégica pero el auto sigue siendo predecible. Un jugador experto y uno novato aplican la misma técnica de conducción — gas a fondo, freno antes de curva, seguir la trayectoria. No hay límites que explorar ni penalidades por atajarla.

## Las tres phases

### R5-1: Physics with Traction Limit
- Oversteer al acelerar demasiado en salida de curva lenta — corrección manual o pérdida de posición
- Understeer al entrar demasiado rápido en curva rápida — el auto se va ancho
- Traction limit: wheelspin desde baja velocidad con gas completo
- El modelo actual (friction + auto-accel) se extiende con estos casos límite, no se reemplaza

### R5-2: Track Limits & Penalty System
- Salir de los límites de pista activa contador de advertencias por curva
- 3 advertencias → time penalty de 5 segundos al resultado final
- Zonas definidas por pista (no genéricas) — Monaco tiene márgenes distintos a Monza
- IA sujeta a los mismos límites

### R5-3: Car Setup & Adaptive AI
- Setup pre-carrera: downforce (curva vs recta) y balance de frenos — 2-3 sliders
- El setup óptimo varía por circuito: Monaco = max downforce, Monza = min downforce, Spa = compromiso
- IA adaptativa: si el jugador lidera el campeonato, rivales del top 3 aumentan agresividad
- ERS orgánico: sustituye Push to Pass discreto de R4 — carga en frenada, gasto en aceleración

## Relacionado

- [[race-strategy-drama]] — Release 4, el paso previo necesario
- [[championship-season-mode]] — Release 3, la base de la temporada
