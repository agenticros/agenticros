# {{displayName}}

{{description}}

> **Tutorial skill** — meant for local learning with `npm run dev`. Customize the code or scaffold with `--template robot` before publishing to the marketplace.

## Local dev

```bash
npm install
npm run dev
```

## Invoke (OpenClaw / Claude / Gemini)

After registering with your gateway:

```bash
agenticros skills add .
agenticros skills sync
# restart gateway
```

Try prompts from [demo.md](./demo.md).

## Publish

```bash
npx agenticros publish
```

Tutorial skills stay unlisted on [skills.agenticros.com](https://skills.agenticros.com) unless you customize and use `--graduate`.
