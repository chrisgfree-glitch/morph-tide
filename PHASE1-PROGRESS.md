# Morph Tide Phase 1 progress

Working tree: `/workspace/evo-game`. Remote: `chrisgfree-glitch/evo-back-to-eden`. No env vars or secrets were changed.

## Done

- **1. Water / caustics color space** — custom `ShaderMaterial` fragment shaders in `src/game.ts` (`waterMat`, `causticMat`) now run `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` after `gl_FragColor` is set, matching three.js r170 color management with this project's sRGB output + ACES tone mapping.

## Next

- 2. Hit / eat / evolve feedback (low-frequency camera punch, sound, vibrate)
- 3. Instance bubble meshes
- 4. Cheap early shallows shelter
- 5. Strand Colossus as a region gate (not `w.won`)
- 6. Light food buff (health / stamina, no starvation)
- 7. Tighter follow camera in bite / dash + simple collision probe
- 8. HUD contrast 4.5:1 and touch targets >= 44 CSS px

Then: preview deploy, Playwright smoke at 1280x800 and 390x844, promote to production if the preview looks clean.

## Known issues

- Color-space fix is compile-time only so far; live look on desktop and phone is **not verified**.
- Later Phase 1 items are not started.
- Do not add deferred rendering, SSAO, DoF, or a CubeCamera.
