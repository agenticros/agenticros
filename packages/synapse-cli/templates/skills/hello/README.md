# {{displayName}}

This project was previously known as AgenticROS.


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
synapse skills add .
synapse skills sync
# restart gateway
```

Try prompts from [demo.md](./demo.md).

## Publish

```bash
npx @corebrum/synapse publish
```

Tutorial skills stay unlisted on [skills.corebrum.com](https://skills.corebrum.com) unless you customize and use `--graduate`.
