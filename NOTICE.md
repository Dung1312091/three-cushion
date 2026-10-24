# NOTICE

## pooltool (Apache License 2.0)

Parts of the physics engine are ports of algorithms from **pooltool** by Evan Kiefl and contributors,
https://github.com/ekiefl/pooltool, licensed under the Apache License, Version 2.0:

- `src/engine/resolve/ballBall.ts` — frictional inelastic ball–ball collision (`physics/resolve/ball_ball/frictional_inelastic`).
- `src/engine/resolve/cushion/mathavan.ts` — Mathavan (2010) cushion model (`mathavan_2010`).
- `src/engine/motion.ts` — sliding/rolling/spinning equations of motion (after Kiefl, "pooltool theory").

No code was copied from `tailuge/billiards` (GPL-3.0); it was only consulted for behaviour.

## Formula sources

- Dr. Dave Alciatore, technical proofs TP A.14 (throw), A.19 (massé), A.30 (cue strike), A.31 (squirt): https://billiards.colostate.edu/technical_proofs/
- S. Mathavan, M. R. Jackson, R. M. Parkin (2010), "A theoretical analysis of billiard ball dynamics under cushion impacts", Proc. IMechE Part C.
- W. Leckie, M. Greenspan, event-based pool physics.
- Bộ 50 numbering and corrections: Bida Hoàng Anh Nam, Bida Thành Hiền (Vietnamese sources, single source, pending coach review).
