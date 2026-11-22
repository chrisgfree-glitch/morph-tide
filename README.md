# Safe Haven recruiting assistant

A small chat page for people applying to the Security System Sales Rep role at Safe Haven Security Services, an ADT Authorized Dealer. It answers from one facts file, streams replies through the Vercel AI Gateway, and hands anything it does not know to Christopher (Chris) Grantham.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Chat needs a model. On your machine, set `AI_GATEWAY_API_KEY` in `.env.local`. On Vercel you do not set that key: the deployment authenticates with OIDC.

```bash
npm test
npm run build
```

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | Local only | Authenticates AI Gateway requests in development. Leave unset on Vercel. |
| `AI_MODEL` | No | Gateway model id. Defaults to `anthropic/claude-sonnet-4.5`. |
| `RECRUITER_PHONE` | No | Shown as "Call Chris". Hidden when empty. |
| `RECRUITER_EMAIL` | No | Shown as "Email Chris". Hidden when empty. |
| `APPLY_URL` | No | Overrides the Apply now link. Must be an `http` or `https` URL. |

When `APPLY_URL` is unset, Apply now and the assistant use Chris's Safe Haven link: <https://careers.mysafehaven.com/v/safehaven-christophergrantham-4287>. A valid `APPLY_URL` replaces that link. Phone and email stay hidden until you set them. Do not put a made-up phone number or email in the repo.

## Deploy on Vercel

The app is a standard Next.js project. Vercel detects it with no extra config.

1. Push this repository and import it in Vercel as a Next.js project.
2. Turn on [AI Gateway](https://vercel.com/docs/ai-gateway) for the team. A payment method is required before free Gateway credits can be used. Deployed functions send the model id `anthropic/claude-sonnet-4.5` (or `AI_MODEL`) and authenticate with the deployment's OIDC token. Do not add an Anthropic or OpenAI API key.
3. In Project Settings → Environment Variables, set `RECRUITER_PHONE` and `RECRUITER_EMAIL` if you want those buttons. Leave `APPLY_URL` unset to keep Chris's default application link, or set it to replace that link. Set `AI_MODEL` only if you want a different gateway model, such as a newer Claude Sonnet id from `https://ai-gateway.vercel.sh/v1/models`.
4. Deploy. Changing those variables means redeploying so the new values are picked up.

## Change what the bot is allowed to say

Edit [`lib/facts.ts`](lib/facts.ts) and redeploy. The instructions in [`lib/prompt.ts`](lib/prompt.ts) are built from that file.

The assistant is told to refuse anything that file does not contain: base pay, benefits, training, leads, schedules, territories, license / car / background-check requirements, start dates, and income guarantees. It should say it does not have that detail and that Chris will answer it directly.

Keep new copy factual. A line added to `facts.ts` becomes something the bot can say.
