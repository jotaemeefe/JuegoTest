---
name: race-strategy-drama
description: Sistema de estrategia de carrera y eventos dinámicos — Release 4, el salto de jugable a adictivo
metadata:
  type: seed
trigger_condition: cuando Release 3 (Championship Mode) esté completo
planted_date: 2026-06-26
---

# Seed: Race Strategy & Drama

## El problema que resuelve

Después de R3, el meta-loop existe (temporada, puntos, tabla) pero cada carrera individual sigue siendo determinística: "andá lo más rápido posible." No hay decisiones mid-race, no hay incertidumbre, no hay momentos inesperados. Las carreras son repetibles pero no re-jugables.

## Fundamento en teoría de juegos

**Variable Reward Schedules (Skinner):** los eventos aleatorios (Safety Car, lluvia) crean el efecto "una más" — si cada carrera puede voltear en cualquier momento, nunca sabés que la siguiente no es la mejor que jugaste.

**Decisiones bajo incertidumbre (Nash):** el timing del pit stop es un problema minimax puro. Entrás temprano (perdés posición, ganás goma fresca) o esperás (mantenés posición, arriesgás degradación). La IA tiene su propia estrategia opaca. Esa tensión no se puede crear de otra manera.

**Flow state + Mastery expression (Csikszentmihalyi):** los sector times y el Push to Pass crean capas de profundidad que los expertos exploran y los casuales ignoran — el juego se vuelve diferente según tu nivel sin cambiar las reglas.

## Las tres phases

### R4-1: Tire Strategy
- 3 compuestos: Blandos (~5 vueltas), Medios (~8), Duros (~12, algo más lentos)
- Degradación: velocidad baja ~5% por vuelta al agotarse el compuesto
- Pit stop: ~8 segundos parado + selector de compuesto
- Selección pre-carrera: el jugador elige estrategia de entrada
- IA con estrategia propia — no sabés cuándo pican

### R4-2: Dynamic Race Events
- Safety Car: ~20% de probabilidad al colisionar autos. Compacta el campo, destruye ventajas, activa la decisión pit-bajo-SC
- VSC: versión suave, congela brechas
- DRS: rectas largas habilitadas por pista, permite atacar y crear mechanic de defensa
- Lluvia aleatoria (15%): cambia toda la estrategia de compuestos mid-race

### R4-3: Mastery Feedback
- Sector times S1/S2/S3 con color coding (verde/violeta/amarillo)
- Push to Pass: boost de 5s que recarga en media vuelta — decisión táctica por vuelta
- Radio del ingeniero: mensajes contextuales de brecha, posición, estrategia rival

## El momento que define este release

Estás P1 con neumáticos degradados. Sale el Safety Car por una colisión al fondo. La IA pica y sale con Blandos frescos. Tenés 3 segundos para decidir si entrás a boxs o defendés. Si entrás, salís P3 con goma nueva. Si no, defendés 4 vueltas con neumáticos al límite.

Ese momento — que puede pasar en cualquier carrera — es lo que hace que alguien diga "una más."

## Relacionado

- [[championship-season-mode]] — Release 3, el paso previo necesario
- [[vision-ios-android-app]] — horizonte de largo plazo
