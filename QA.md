# Verification record

## Passed

- `npm run build`: Vite production bundle generated successfully.
- `npm test`: nine business-rule and scene tests cover deduplicated XP, rank thresholds, unsafe URL rejection, prompt completeness scoring, deep-link validation, mission status, next-mission selection, finite campus geometry, and GPU instance batching.
- Live API integration: three disposable accounts enrolled and signed in successfully through the deployed invitation function.
- Anonymous callers cannot read the curriculum.
- Learners see only their own membership, submissions, and assignments.
- Mentors see the test circle; learners cannot create mentor invites, and mentors cannot create mentor invites (owner-only).
- A submission without a passed quiz is rejected by row-level security.
- Knowledge-check scoring occurs in the database and records the attempt.
- A learner cannot award mastery; a mentor's valid review passes; a duplicate review fails.
- Assignment creation and learner isolation work through the live API.
- Deployed public UI: navigation, practice tabs, isolated iframe JavaScript interaction, planted source-issue feedback, and mobile navigation.
- 390px mobile viewport inspected via a same-origin test iframe. The initial camera framing was corrected after inspection. The polish pass also corrected a mobile header overflow found in the 390px inspection.
- Software-rendered campus presents actual Three.js scene geometry when WebGL is unavailable.
- Test members and their assignments, submissions, attempts, and redeemed invitations removed after verification. Only the private bootstrap owner invitation remains.

## Boundaries

- Browser test environment reports WebGL disabled. GPU-rendered materials and actual Android frame rate are not physically validated.
- Private screens were validated via live backend/API workflows and build checks, not browser entry of a user's credentials.
- No AI models are invoked. Prompt/evidence checks are deliberately labeled heuristics.
- No email ownership verification, self-service password recovery, member suspension UI, server-code execution, or cash rewards are claimed.
- Vite reports the Three.js engine chunk above 500 kB uncompressed; it is separately lazy-loaded. GPU static batching reduces the scene from 658 mesh objects to 95 (18 instance batches). This is a structural optimization, not a measured device frame rate.

## Architectural polish pass

- Live district selection and contextual entry panel verified.
- Unsaved-work dialog verified: Keep editing preserved the exact draft; Leave without saving completed the requested route change.
- Hash-based mission navigation verified through the live UI.
- Formatting gate passes; a GitHub Actions workflow runs formatting, tests and production build on main pushes and PRs.
- Public repository manifest excludes curriculum.json, quiz-keys.json, owner invitations, environment secrets and temporary test files.
