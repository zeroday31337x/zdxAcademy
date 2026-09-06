# Deployment

## 1. GitHub

Repository:

`zeroday31337x/zdxAcademy`

## 2. Vercel

Use the existing Vercel project:

`zdx-academy`

Framework: Next.js

Build command:

`npm run build`

No custom output directory is required.

## 3. Vercel environment variables

Set these for Production:

```
NEXT_PUBLIC_SUPABASE_URL=https://bwxkliuzulnvsqeijlnk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>

ACADEMY_WORKER_TOKEN=<worker token from secure VPS configuration>
ACADEMY_ADMIN_TOKEN=<academy admin token>

STRIPE_WEBHOOK_SECRET=<Academy Stripe webhook signing secret>
STRIPE_ACADEMY_CERTIFICATE_PRICE_ID=price_1UCSY8K8c2WLLqdxJ6e0hgbB
STRIPE_ACADEMY_CERTIFICATE_PAYMENT_LINK_ID=plink_1UCSgJK8c2WLLqdxRY269RU7
STRIPE_ACADEMY_CERTIFICATE_PAYMENT_LINK=https://buy.stripe.com/3cIbJ28Rh5pQ9YU5VF6Ri04

CERT_SIGNING_PRIVATE_KEY=<Ed25519 private key from secure VPS configuration>
CERT_SIGNING_KEY_ID=a001d6f73e725a23
```

The worker token, webhook secret, and signing private key already have secure server-side copies. Do not copy them into Git.

## 4. Domain

Canonical production domain:

`academy.zerodrivex.com`

Attach it to the Vercel `zdx-academy` production deployment.

ZeroDriveX DNS is already hosted on Vercel DNS. The current Academy DNS resolves as a CNAME to `zdx-academy.vercel.app`; the remaining step is attaching the custom domain to this Vercel project.

## 5. Stripe

The live Stripe objects are already created.

Product:

`prod_VCsIsNrssjo1WB`

Price:

`price_1UCSY8K8c2WLLqdxJ6e0hgbB`

Payment Link:

`plink_1UCSgJK8c2WLLqdxRY269RU7`

The app creates an internal payment reference after confirming eligibility, then appends that reference as Stripe's `client_reference_id` parameter to the Payment Link. This means the Academy runtime does not need a Stripe secret API key for checkout creation.

Webhook endpoint:

`https://academy.zerodrivex.com/api/stripe/webhook`

Enabled events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

## 6. Supabase Auth

Configure the production Site URL as:

`https://academy.zerodrivex.com`

Add the dashboard redirect URL if required:

`https://academy.zerodrivex.com/dashboard`

## 7. Verification

After deployment:

1. open the course without signing in
2. create a learner account
3. confirm progress persists
4. complete the deterministic final assessment
5. submit a capstone
6. approve the capstone
7. start the $4.99 certificate Checkout
8. confirm the Stripe webhook marks the payment paid
9. confirm one Ed25519-signed credential is issued
10. verify it publicly at `/verify/<credential-id>`
11. resend the webhook event and verify no duplicate certificate is created
