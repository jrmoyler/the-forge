# Verification record

## Passed

- `npm run build`: Vite production bundle generated successfully.
- `npm test`: four business-rule tests cover deduplicated XP, rank thresholds, unsafe URL rejection, and prompt completeness scoring.
- Live API integration: three disposable accounts enrolled and signed in successfully through the deployed invitation function.
- Anonymous callers cannot read the curriculum.
- Learners see only their own membership, submissions, and assignments.
- Mentors see the test circle; learners cannot create mentor invites, and mentors cannot create mentor invites (owner-only).
- A submission without a passed quiz is rejected by row-level security.
- Knowledge-check scoring occurs in the database and records the attempt.
- A learner cannot award mastery; a mentor's valid review passes; a duplicate review fails.
- Assignment creation and learner isolation work through the live API.
- Deployed public UI: navigation, practice tabs, isolated iframe JavaScript interaction, planted source-issue feedback, and mobile navigation.
- 390px mobile viewport inspected via a same-origin test iframe. The initial camera framing was corrected after inspection.
- Software-rendered campus presents actual Three.js scene geometry when WebGL is unavailable.
- Test members and their assignments, submissions, attempts, and redeemed invitations removed after verification. Only the private bootstrap owner invitation remains.

## Boundaries

- Browser test environment reports WebGL disabled. GPU-rendered materials and actual Android frame rate are not physically validated.
- Private screens were validated via live backend/API workflows and build checks, not browser entry of a user's credentials.
- No AI models are invoked. Prompt/evidence checks are deliberately labeled heuristics.
- No email ownership verification, self-service password recovery, member suspension UI, server-code execution, or cash rewards are claimed.
- Vite warns that the two main chunks exceed 500 kB uncompressed. Three.js is lazy-loaded; the combined JS transfer is approximately 288 kB gzipped.
