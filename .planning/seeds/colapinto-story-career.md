---
name: colapinto-story-career
description: Campaña narrativa ramificada que revive la carrera real de Colapinto desde karting hasta F1 — Release 6, el juego definitivo
metadata:
  type: seed
trigger_condition: cuando Release 5 (Sim-Lite Physics) esté completo
planted_date: 2026-06-27
---

# Seed: The Colapinto Story — Career Mode

## El problema que resuelve

Después de R5, el juego es técnicamente excelente y estratégicamente profundo. Pero sigue siendo un juego de F1 genérico con Colapinto como skin. Release 6 convierte eso: pasa a ser *el* juego de Colapinto — el único que cuenta su historia y te deja vivirla.

## La historia real como guión

Colapinto tiene exactamente el arco que necesita un videojuego:

| Año | Categoría | Hito narrativo |
|-----|-----------|----------------|
| 2014–2018 | Karting | Pilar (Argentina) → Europa solo a los 15 años |
| 2019 | F4 UAE / F4 Italia | Primer monoplaza, primera temporada europea |
| 2020–2022 | Formula Regional / F3 | Alpine lo incorpora a su academia |
| 2023 | Formula 2 (Prema) | Temporada revelación — el mundo empieza a mirarlo |
| 2024 | F1 debut Williams | Llamado 48hs antes de Monza. Sale P10 en su debut. |
| 2025 | Alpine F1 | Primera temporada completa en F1 |

## El mechanic central: resultados vs. historia real

Cada carrera tiene el resultado histórico de Colapinto como referencia. El jugador siempre avanza si supera un mínimo básico (no hay bloqueos frustrantes), pero el delta entre su resultado y la historia real alimenta variables narrativas que bifurcan el relato.

- **Superaste historia:** Alpine se acerca antes, el relato es más heroico
- **Igualaste historia:** el camino canónico — la historia se desarrolla como sucedió
- **Quedaste por debajo:** avanzás igual pero la narrativa lo refleja — Williams duda más, la oferta tarda

## Las cuatro phases

### R6-1: Career Engine
- Máquina de estados: categoría, resultados acumulados, variables de bifurcación
- Save/load en localStorage (el jugador puede retomar su carrera)
- Sistema de comparación histórica por carrera
- Hub entre carreras: calendario, tabla, próximo evento

### R6-2: Category Physics Profiles
Cada categoría se siente diferente. El R5 traction model es la base; los perfiles son parámetros distintos:
- **Karting:** cero alas, grip mecánico, lento pero muy reactivo
- **F4:** primeras alas, potencia limitada
- **F3/Regional:** más downforce, empieza a sentirse real
- **F2:** casi F1, pit stop obligatorio Feature Race
- **F1:** todo lo que ya tiene el juego

### R6-3: Career Tracks
- Kartodromo (trazado corto, ~8 waypoints)
- Mugello (F3), Silverstone (F2 feature), Jeddah (F2 sprint)
- Monza (debut F1 — el momento más importante del juego)

### R6-4: Branching Narrative
- Cards de historia entre carreras (estilo periódico, arte canvas)
- Momentos de decisión con peso real: "Alpine te ofrece academia" / "Williams llama a las 48hs"
- 3 niveles de bifurcación por rendimiento
- Múltiples finales en F1 según la temporada jugada

## Por qué este es el juego único

No hay ningún otro juego que cuente esta historia. El arco ya existe en la realidad — el trabajo es convertirlo en algo jugable donde tus decisiones importen dentro del marco histórico real.

## Relacionado

- [[sim-lite-physics]] — Release 5, la base de los physics profiles por categoría
- [[championship-season-mode]] — Release 3, el sistema de temporada reutilizable en F2/F1
- [[race-strategy-drama]] — Release 4, pit stops y estrategia activos en F2 y F1
- [[vision-ios-android-app]] — horizonte de largo plazo, este modo sería el killer feature de la app nativa
