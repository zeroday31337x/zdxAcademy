# Deployment

## 1. GitHub

Create the repository as:

`zeroday31337x/zdx-academy`

Push the repository contents from `/opt/zerodrivex/zdx-academy`.

## 2. Vercel

Create a Vercel project from the GitHub repository.

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

Attach:

`binary.zdxai.us`

to the Vercel production deployment.

Replace the old Hostinger DNS target with the DNS target Vercel specifies.

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

`https://binary.zdxai.us/api/stripe/webhook`

Enabled events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

The webhook ignores Checkout Sessions that do not have Academy certificate metadata, so other ZeroDriveX Checkout traffic is not processed by the Academy handler.

## 6. Supabase Auth

Configure the production Site URL as:

`https://binary.zdxai.us`

Add the dashboard redirect URL if required:

`https://binary.zdxai.us/dashboard`

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
