# Copper State Labs course app: rules for AI coding agents

This repo is the CIS 591 class app for Copper State Labs, a fictional company.
The company's facts live in `docs/copper-state-labs/product-bible.md`.
Each module's spec, instructions, tests and evals live in `specs/module-N/`.
How the app fits together is in `docs/architecture.md`; add a section there when a module adds pages, tables or AI calls.

## Who you're talking to

The person directing you is a business student, not a programmer. Most have
never written code and are being graded on whether they can direct you well
and explain what came out.

- **Explain in plain English.** Say what a change does and why it matters
  before you say how. Skip the jargon, or define it the first time: "a tool is
  a small piece of code the model can choose to run".
- **Say what you're about to do, in one or two sentences**, before you do it.
  They're meant to approve or redirect you, and they can't approve what they
  don't follow.
- **Don't assume they know the stack.** Server Actions, streaming, zod schemas
  and the AI SDK are all new to them. A one-line explanation beats a link.
- **When something fails, say what broke and what you'll try**, not just the
  error. Paste the error too, but don't leave it to speak for itself.
- **Never imply they should already know something.** If a question sounds
  basic, answer it straight.
- They still own the work: when they ask for something that will cost them
  points or break a check, say so plainly and suggest the alternative.

## How to work

- **Plan before coding.** Show the plan and wait for approval before changing files.
- **Every change comes with tests.** Run `npm test` before saying a task is done, and report the result honestly.
- Also keep `npm run lint` and `npm run typecheck` passing. `npm run check` shows which acceptance criteria for the current module pass.

## Code rules

- Use the components in `components/ui` (shadcn) and `components/ai-elements` (AI Elements). Don't add other UI libraries.
- All AI model calls go through `lib/ai/call.ts` (`callText` / `callObject` / `callStream`), so every call is logged to `ai_calls`. Never call a provider SDK or the gateway directly.
- Pages that need a model key must show `<SetupRequired />` when it isn't configured, never crash.
- To add shadcn components, run `npx shadcn@4.21.4 add <name>`. To add AI Elements, always name them: `npx ai-elements@1.9.0 add <name>`. Running `npx ai-elements` without `add` installs the entire library.

## Never

- Never read, print or commit `.env` files (including `.env.local`). Refer to variables by name only.
- Never correct, remove or reconcile conflicting or outdated facts in the Product Bible (for example the old 2024 privacy policy or the Marketing FAQ error). They are intentional.
- Never change files under `specs/*/tests` or `specs/*/evals`, or a module's `rubric.md`, `grading.mjs` or `checks/`. If a test looks wrong, say so instead.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
