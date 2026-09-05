# ZeroDriveX Academy

ZeroDriveX Academy is a serious technical education platform built around real systems, reproducible evidence, translation, and cryptographically verifiable credentials.

## Product standard

- Learning content is free.
- Verified course credential: $4.99 one time.
- Public employer verification requires no account.
- Credentials are signed with Ed25519 and bound to a course version.
- Research, course creation, review, translation, and capstone review are separate agent roles.
- Technical truth is preserved. If a procedure must be constrained, the underlying mechanism is still taught accurately.
- Canonical lessons are translation-ready and translations are independently reviewed before publication.
- Labs produce reproducible technical artifacts instead of only multiple-choice completion.

## Current course

**Understanding Apple Mach-O Binary Internals**

The rebuilt course covers:

- thin Mach-O headers and identity
- load commands and parser invariants
- segments, sections, file offsets, and virtual memory
- symbols and dynamic linking
- dyld export tries and chained fixups
- universal/fat binaries
- embedded code-signing structures and entitlements
- Objective-C and Swift runtime metadata
- repeatable analysis workflow
- final assessment
- evidence-based capstone

Portable Python lab tools and deterministic fixtures are included under `public/labs/`.

## Stack

- Next.js 16
- Vercel
- Supabase Auth + Postgres
- Stripe hosted Payment Links / Checkout
- Groq-backed agent worker on the ZeroDriveX VPS
- Ed25519 certificate signatures

## Stripe

Current live certificate product:

- Product: `prod_VCsIsNrssjo1WB`
- Price: `price_1UCSY8K8c2WLLqdxJ6e0hgbB`
- Amount: $4.99 USD one time
- Payment Link: `plink_1UCSgJK8c2WLLqdxRY269RU7`
- Webhook path: `/api/stripe/webhook`

The app creates a one-time internal payment reference only after checking learner eligibility and passes that reference to Stripe as `client_reference_id`. No Stripe secret API key is required at runtime to start checkout.

Certificate issuance is not based on the browser redirect. The Stripe webhook is authoritative and the database re-checks learner eligibility before storing a paid credential.

## Credential requirements

A paid verified credential requires all of the following:

1. required learning items completed
2. final assessment passed at 80% or higher
3. capstone submitted
4. capstone approved separately from the reviewer agent recommendation
5. successful $4.99 Stripe payment

The certificate database function also validates that the paid Checkout session belongs to the same learner, course, and course version.

## Agent pipeline

```
Research Agent
  ↓
Course Creation Agent
  ↓
Independent Technical Reviewer
  ↓
versioned course draft

Translation Agent
  ↓
Independent Translation Reviewer
  ↓
approved language variant

Capstone Submission
  ↓
Independent Reviewer Agent
  ↓
human/admin approval
```

The agent worker is run by:

`zdx-academy-worker.service`

## Public routes

- `/`
- `/courses`
- `/courses/[slug]`
- `/learn/[course]/[lesson]`
- `/assess/[course]/[lesson]`
- `/capstone/[course]`
- `/verify`
- `/verify/[credential]`
- `/login`
- `/dashboard`

## Server routes

- `/api/courses`
- `/api/verify/[credential]`
- `/api/certificates/checkout`
- `/api/stripe/webhook`
- `/api/agents/research`
- `/api/agents/course-create`
- `/api/agents/review`
- `/api/agents/translate`

## Deployment

See `docs/DEPLOYMENT.md`.

Never commit:

- Stripe secret key
- Stripe webhook signing secret
- Academy worker/admin tokens
- certificate signing private key
- Supabase service-role/secret keys
