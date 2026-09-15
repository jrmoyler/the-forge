# The Forge — architectural polish pass

## Product contract
A private, evidence-led academy for JR's trusted circle. The next mission is the dominant action; the 3D campus is a navigable place, not a marketing backdrop. Preserve membership, real cloud records, the source curriculum, and mentor-awarded mastery.

## Art direction
A miniature collegiate foundry at blue hour: limestone arcades, charcoal slate roofs, copper ridgelines, warm window light, clipped gardens, furnished workrooms, and a mechanical brass hearth. Five districts have different rooflines and functional props. No neon particles, glass cards, reference-image billboards, or decorative loading delays. Geometry, materials, and lighting carry the world.

## UI
Keep DM Sans / Manrope. Body 16px, normal controls 14px, secondary metadata 12px. Canvas #101513; panels #19211d; raised #243025; primary text #f0eee4; secondary #b9c4b4; muted #9fac97; action gold #d5b17a; success #acd2b5; error #efb4a0. Warm editorial mission numbers and district-specific colored rules. Learning cards show actual submitted/mastered/draft state. Selected district has a contextual entry panel with its next mission.

## Motion and controls
Camera targets interpolate during district selection; manual orbit cancels the transition. Walk cycle uses delta time. Optional sound requires explicit opt-in. Pause / play, fullscreen, reset, zoom and quality controls have accessible names and 44px touch targets. Reduced-motion users get immediate camera changes and no ambient animation. Stop work when hidden/offscreen; software renderer uses reduced detail and demand-driven frames. WebGL context loss offers a working map fallback.

## Flow and reliability
Hash routes support back/forward and returning to a mission. Dirty work triggers an in-app leave dialog and browser unload protection. Public visitor preview remains clearly labeled. Search, practice and real mentor review remain functional. Preserve server authority for XP, rubric scores and access roles.

## Components and provenance
Extend the existing React components and Lucide icons. No external component kit is needed; preserve the current React/Three.js stack. UI catalog reviewed; mixing visual kits would add dependencies without solving a product need.

## Validation
Production build, meaningful state tests, deployed public interactions, 390px layout, software-rendered scene, and protected-content exclusion from git. No claim of AAA certification or physical-device performance testing. Repository is public: exclude full curriculum, answer keys, bootstrap invitations, auth credentials and test identities.
