# The Forge — Learning Studio

A private training system built from **The Forge Personal Field Guide**, by John-Ross Moyler / Hataalii, Collective AI Inc.

Production: https://the-forge-academy.vercel.app
Vercel project: `the-forge-academy`
Supabase project: `sieeolvhcmqvumviqqjy` (The Collective AI, US East Ohio)

## Start here

1. Open the private owner enrollment link in the separately delivered `Forge-Owner-Access.txt`. Create your own name, email, and password (12+ characters). After applying the reusable-owner migration below, this same owner invitation can be used repeatedly and does not expire. Each signup creates an owner account; keep this link private. If you already signed up, use **Sign in** with your existing email and password.
2. Open **Your circle → Invite people**. Invite a mentor or learner. Invitations expire after seven days and can be used once. You share these links yourself; the app sends no messages.
3. Assign a mission with a due date and guidance.
4. Learners read the guide, practice, pass a server-scored knowledge check, and submit an artifact plus evidence.
5. Mentors score the five-part rubric and provide feedback. A score of 80/100 without a critical failure awards mastery. A person cannot review their own submission.

Do not put the owner enrollment file in a repository or share it with learners.

## Architectural polish upgrade

- Detailed stone arcades, slate rooflines, warm windows, bespoke workshop props, terraced paving, gardens and an armillary hearth.
- District camera transitions, articulated walking avatar, fullscreen, optional sound, pause, and display modes.
- Readable mission cards with real workflow status, mission stepper and next-task routing that prioritizes revisions and assigned work.
- Shareable hash routes, back/forward navigation, unsaved-mission confirmation and browser unload protection.
- Hidden/offscreen rendering suspension, reduced motion, bounded software geometry and shared GPU resource disposal.

## What works

- Five navigable 3D districts using Three.js, orbit / zoom controls, clickable buildings and labels, and a moving learner avatar. Software SVG rendering of the same scene supports browsers without WebGL.
- Complete private source curriculum: 94 pages, 15 model cards, 66 tool cards, 125 combinations, 12 role missions, original developer links.
- Searchable tool/model/reference library and mission workbooks with persistent drafts.
- Three practice labs: six-part prompt contract, isolated HTML/CSS/JS preview, and synthetic source-conflict exercise.
- 12 server-graded knowledge checks, recorded retakes, and submission gating.
- Private membership, owner/mentor/learner roles, invitation enrollment, cloud progress, assignments, reviews, and member activity.
- Unique-per-mission XP, four rank thresholds, four achievement badges, mastery collection, and personal JSON export.
- Responsive navigation and layouts, keyboard-operable controls, modal focus management, reduced motion.

## Connect this repository to Vercel

Application source: https://github.com/jrmoyler/the-forge

This repository is public. The full guide, quiz answer keys, owner invite, test accounts, and private drafts are excluded. The existing Supabase database holds the private curriculum. Public client code contains only three clearly labeled preview paths.

```sh
npm ci
npm run build
npm test
```

In Vercel, open **the-forge-academy → Settings → Git → Connect Git Repository** and choose that repository. Use the repository root, Vite preset, `npm run build`, and `dist`. Set the production branch to `main`. No replacement project is needed. The existing Supabase backend stays connected.

The public Supabase publishable key in `src/backend.js` is intentionally browser-safe. No service-role key or owner credential is shipped in the client or source archive. Row-level security is the access boundary.

Local development: `npm run dev`. If your container cannot enumerate network interfaces, use `npx vite --host 127.0.0.1`.

## Data and security

- Full curriculum requires an authenticated member. Learners read only their own profile, progress, assignments, submissions, and quiz attempts. Mentors can inspect the circle's training records.
- Learners cannot change their role, grade a review, see quiz answer keys, or award server mastery.
- Quiz grading and mentor review use database functions with fixed search paths. Submission insertion requires a passed quiz; only one pending submission per member/mission is allowed.
- Invitations are random bearer credentials, stored as SHA-256 hashes. Ordinary mentor/learner invitations are single-use and time-limited; the separately issued owner invitation is reusable and non-expiring after the migration below. Owner creation uses a separately delivered bootstrap token, never first-user-wins registration.
- Enrollment is authorized by the private invitation. The supplied email is an account identifier; this flow does not prove email ownership. Account recovery currently requires assistance from the project administrator through Supabase. The app does not provide password reset or account suspension controls.
- The code sandbox has an opaque origin, no same-origin privileges, and a CSP blocking network, forms, images other than data URLs, and external scripts. It is a client-side experiment pad, not a container or arbitrary server-code runtime. Infinite loops can still stall a browser tab.
- Review values determine mastery; rewards are recognition badges and XP, not cash or redeemable goods.
- No AI inference is connected. Prompt and evidence feedback are labeled heuristics; this app does not spend model credits or pretend to generate model responses.
- The guide is preserved as a dated September 15, 2026 source, not represented as an independently updated catalog.
- Normal hosted-service usage limits and future pricing apply; project creation was quoted at $0/month.

## Backend source

`supabase/schema.sql` defines all tables, row-level security, rubric validation, invitation functions, quiz grading, and submission gates. It has already been applied to the live project; do not re-run it there.

`supabase/functions/enroll/index.ts` is the deployed enrollment function. Its invitation validates access before account creation; it uses the server-side Supabase service role provided by the Edge Function environment. `verify_jwt=false` is intentional because new members have no session; the invitation is the function's custom authentication mechanism.

The private source curriculum and answer keys are already seeded in the live database. They are intentionally excluded from this public repository. Their private source copy remains in the original owner archive.

## Reusable owner invitation migration

Apply `supabase/migrations/20260917000000_reusable_owner_invitation.sql` to the existing Supabase project as a database migration. Merging or deploying the Vercel frontend alone does **not** run SQL migrations. Apply the migration before considering the invitation fix live; no Edge Function redeploy is required for the behavior change.

The migration identifies the original owner invitation by `role = 'owner' and created_by is null`, which was verified to match exactly one already-used invitation in the live project. It preserves its token hash and redemption history, marks it reusable, and removes its expiry. It stops if more than one bootstrap invitation exists, rather than changing multiple owner credentials. No private token or hash is committed. New ordinary invitations retain their existing expiry and single-use rules. Successful redemptions retain the latest `used_by`/`used_at`; membership creation and redemption remain atomic.

Fresh installations should apply `schema.sql`, provision their private bootstrap invitation, then apply this migration. The schema alone does not make future owner invitations reusable automatically.

## Validation and limits

See `QA.md`. Build and business-rule tests passed. Live API tests covered enrollment, authentication, record isolation, quiz gates, scoring, mentor permissions, reviews, and assignments. Disposable test accounts were removed after testing.

Browser testing covers the deployed public navigation and practice interactions. The test browser disables WebGL; the software-rendered 3D fallback was used for visual checks. Physical Android GPU performance and the private owner onboarding should be checked on your actual device. No claim of physical-device validation is made.
