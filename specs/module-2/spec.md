# Module 2 Spec: Ask Copper, the shopping chatbot

_Fictional — for educational use._

## Scenario

The landing page is live, and shoppers have questions. The Copper Crew (the support team) gets the same ones every day: "What will Copper Home cost me with Copper Plus?" "Is Copper Notes in Night Sky in stock?" CEO Priya Nair wants a chatbot on the site that answers them, and gets them right every time.

AI models are good at conversation, but they don't know today's stock, and they're bad at remembering prices and doing math. So Ask Copper doesn't guess: it uses **tools**, small pieces of ordinary code the model can ask the app to run. One tool looks up prices, one does the math, and one checks stock in the database.

The chatbot also **shows its work**. As the answer streams in, the panel draws every step: the tools Copper could choose from, what it was thinking, which tool it called, what it sent, what came back, and finally the answer. That running commentary is the point of this module.

## User story

As a **shopper on the Copper State Labs site**, I want to **ask what Copper products cost and whether they're in stock**, so that **I get a correct answer before I buy**.

## What you have to work with

| Where | What |
|---|---|
| `lib/copper/catalog.ts` | `getProducts()` and `getPlans()`: the real prices and colors (from Module 1) |
| `lib/copper/inventory.ts` | `readInventory()`: the stock list, one row per product color with its units and next shipment date (Product Bible Section 10). Already written for you, and the only file that knows where stock is kept, so part 2 changes it and nothing else. It returns `null` when stock can't be read |
| `lib/ai/call.ts` | `callStream()`: streams a model's answer and logs the call to `ai_calls`. `THOUGHT_SUMMARIES` asks Gemini to explain its thinking |
| `lib/ai/live.ts` | `createLive()` and `readLive()`: send a value that arrives in updates from a Server Action to the page |
| `lib/copper/assistant/progress.ts` | The `Progress` type (the steps and reply the panel draws), `toolCallsOf()`, and `TOOL_LABELS`: the four tool names with a plain-English label each. The panel imports from here, never from `tools.ts`, which reads the stock list |
| `lib/ai/call.ts` | Also `isAiConfigured()`: true when an AI key is set. It reads a server-only variable, so call it in `app/page.tsx` and pass the answer to the panel as a prop |
| `lib/copper/assistant/tools.ts` | **Starter file.** The four tools, with TODOs for you to fill in |
| `lib/copper/assistant/instructions.ts` | **Starter file.** Copper's instructions to the model, which you write in plain English |
| `lib/copper/assistant/ask.ts` | **Starter file.** `askCopper()`, the Server Action that streams the answer |
| `components/ui/` | shadcn components, including `sheet` (the side panel), `card`, `badge` and `switch` |

## What this module is really teaching

Four ideas, and the build is arranged so you can see each one happen rather
than take it on faith:

| Idea | Where you see it |
|---|---|
| **A tool is a menu, not magic** | Station 1 lists the four tools every time. The model is handed that list and picks from it |
| **The model decides; your code answers** | The tool card's two halves: Copper writes the input, your ordinary TypeScript computes the result. The model never does the arithmetic |
| **A contract protects the business** | The zod schemas reject 6 years or a product that doesn't exist, even when the model asks for them |
| **Without tools, a model invents** | The tools-off chat, where the thinking station shows Copper making prices up and the reply states them as fact |

If a classmate asked you "what is a tool, really?", you should be able to open
this panel and answer by pointing at it.

## Key ideas

| Idea | In this module |
|---|---|
| **Tool** | A function the model can ask the app to run. The model sends the input; the app runs the code and hands back the result |
| **Tool contract** | The rules for a tool's input. The app rejects anything outside them, even if the model asks |
| **The agent loop** | Think, pick a tool, send inputs, read the result, decide again, answer. At most 5 steps |
| **Live data** | Stock changes every day, so it can't be written into the model's instructions. A tool reads it fresh from the database each time |
| **Bounded** | The tools only *read*. They can't buy, refund or change anything |
| **Streaming** | The answer arrives in pieces, so the panel can show each step as it happens instead of a spinner |
| **Thought summary** | Gemini's own short account of what it's doing and why, shown to the shopper |

## What to build

### 1. The four tools (`lib/copper/assistant/tools.ts`)

**`get_products`**: no input (`inputSchema: z.object({})`). Returns every product as `id`, `name`, `type`, `priceUsd` and `colors` (the colour names, exactly as the catalog spells them), read from the catalog. This is the tool that answers "what do you sell?" and "what colours does Copper Notes come in?".

It says nothing about stock. What colours a product **comes in** is a catalog fact and never changes; whether one is **on the shelf today** is live data, and only `check_availability` knows it.

**`get_prices`**: no input (`tool()` still needs a schema, so give it `inputSchema: z.object({})`). Returns every product (`id`, `name`, `priceUsd`) and every plan (`id`, `name`, `monthlyUsd`, `annualUsd`), read from the catalog.

**`calculate_cost`**: works out the total cost.

| Input | Allowed values |
|---|---|
| `products` | A list of 0 to 5 devices: `"copper-home"` or `"copper-notes"`. The same device can appear twice (two Copper Homes) |
| `plan` | `"free"` or `"copper-plus"` |
| `billing` | `"monthly"` or `"annual"` |
| `years` | A whole number from 1 to 5 |

It returns `lines` (one per item, each with an `item` label and its `usd` cost) and `totalUsd`. The rules:
- Each device is paid for once, and its line is the product's name.
- Copper Plus covers **the whole household**, so it's counted once, no matter how many devices. Monthly billing costs `monthlyUsd × 12 × years`; annual billing costs `annualUsd × years`.
- **The free plan adds no line at all**, because it costs nothing.
- Round each line to cents, then add the lines up and round the total to cents as well.
- All prices come from the catalog. If the catalog changes, the answers change too.
- The wording of an `item` label is yours; nothing tests it.

**`check_availability`**: checks stock with `readInventory()` from `lib/copper/inventory.ts`.

| Input | Allowed values |
|---|---|
| `product` | `"copper-home"` or `"copper-notes"` |
| `color` | Optional. A color name, in any capitalization ("night sky"). Leave it out to get every color |

It calls `readInventory()` **every time** it runs (never a saved copy), because stock changes. Two things to know before you write it:

- **A stock row's `product` holds the display name** ("Copper Notes"), not its id. `readInventory()` hands you every row, for both products, so filter by the name you get from `getProducts()`.
- **Check the color against the catalog first, before you read stock.** A color the product doesn't come in is always `"not_a_color"`, even when stock can't be read.

It returns one of three answers:

| `status` | When | What else it returns |
|---|---|---|
| `"ok"` | The stock was found | `product` (its name, like "Copper Notes") and `colors`: one entry per color with `color`, `stock` and `restockDate` |
| `"not_a_color"` | The product doesn't come in that color (Copper Notes in Patina Teal) | `product`, the `color` asked for, and `colors`: the product's real colors from the catalog |
| `"unavailable"` | `readInventory()` returned `null` | A `message` saying stock can't be checked right now. The whole result must not contain the words `in_stock`, `low_stock` or `backordered` anywhere, including inside your message |

The stock rules, in this order: **0 units** is `"backordered"`, and `restockDate` is the row's `next_shipment`. **1 to 9 units** is `"low_stock"`. **10 or more** is `"in_stock"`. Low stock and in stock both have `restockDate: null`. Give each color back in the catalog's own capitalization ("Patina Teal"), not the shopper's. If a color has no row in the table, leave it out of `colors`; the answer is still `"ok"`.

Export the input rules as `calculateCostInput` and `checkAvailabilityInput` (zod schemas), the functions as `listProducts()`, `getPrices()`, `calculateCost()` and `checkAvailability()`, and the tools as `copperTools = { get_products, get_prices, calculate_cost, check_availability }`, made with `tool()` from `ai`. (`listProducts()`, not `getProducts()`: the catalog already exports that name.) Give each tool a one-sentence `description`: that's how the model knows when to use it.

### 2. Copper's instructions (`lib/copper/assistant/instructions.ts`)

`COPPER_INSTRUCTIONS`, in plain English, at least 40 words. It must tell the model to:
- Speak as Copper: warm, short sentences, plain language (Product Bible Section 2).
- **Always** use the tools for products, colours, prices, totals and stock, and never answer them from memory.
- Treat "what colours does it come in?" and "is that colour in stock?" as different questions: the first is `get_products`, the second is `check_availability`.
- Only answer questions about the products, their colours, prices, costs and stock. For anything else (warranty, setup, privacy), say it can't help with that yet and suggest the Copper Crew.
- Say clearly when it isn't sure, or when a tool says stock can't be checked.

### 3. `askCopper()` (`lib/copper/assistant/ask.ts`)

A Server Action: `askCopper({ messages, useTools })` returns `{ progress }`, where `progress` is a live value the panel reads with `readLive()`.

**The request has exactly two fields**, `messages` and `useTools`, and nothing else. `messages` is the conversation as `{ role, content }` turns: the shopper's questions and Copper's finished replies (as `role: "assistant"`), with no steps or tool data.

- **Return `{ progress }` straight away** and read the stream in the background. If you wait for the stream to finish before returning, the panel shows nothing until the very end, which defeats the point.
- Stream the question with `callStream({ module: 2, feature: "ask-copper" }, …)`, passing the instructions as `instructions:` (so they reach the model as its system message, not as another turn), the whole conversation as `messages:`, and `providerOptions: THOUGHT_SUMMARIES`. **Send `THOUGHT_SUMMARIES` on both paths**, with tools and without: watching Copper think its way to an invented price is the whole point of the tools-off chat.
- If `useTools` is true, send `COPPER_INSTRUCTIONS` and `copperTools`, with up to 5 steps (`stopWhen: stepCountIs(5)`). If it's false, send **no instructions and no tools**: just the conversation, so the model answers from memory alone with nothing telling it to check. Don't send Copper's instructions with the tools missing — "always use your tools" and then no tools makes the model return nothing at all.
- Read `result.fullStream` and build up a `Progress` (see `progress.ts`), calling `update` as it changes:

| Stream part | Fields to read | What to do |
|---|---|---|
| `reasoning-delta` | `part.text` | Add to the current `thinking` step, or start one |
| `tool-input-start` | `part.id`, `part.toolName` | Add a tool step with that name and `state: "calling"`. The input isn't known yet |
| `tool-call` | `part.toolCallId`, `part.input` | Save the tool's `input` |
| `tool-result` | `part.toolCallId`, `part.output` | Save the `output` and set `state: "done"` |
| `tool-error` | `part.toolCallId`, `part.error` | Put the message in the step's `output` and set `state: "error"` |
| `text-delta` | `part.text` | Add to `reply` |

**The ids line up across parts:** `tool-input-start` gives you `part.id`, and the later `tool-call` and `tool-result` give the *same* id as `part.toolCallId`. Match on it, or you'll end up with two steps for one tool call.

- Each update carries **everything so far**, so the panel can just redraw and a missed update loses nothing. `reply` only ever grows.
- **Send a fresh copy each time.** Don't hand out the object you keep changing: the panel (and the tests) may hold on to earlier updates and compare them, and a shared object changes underneath them. Copy the steps array *and* each step inside it.
- Finish with `status: "done"`, or `"error"` with a short apology if the model throws. If the stream ends normally but the reply is empty, that's still `"done"`: put a short apology in `reply`. Only replace an empty reply, never add to a real one.

### 4. The Ask Copper widget

Ask Copper is a floating chat panel, not a section of the page. You'll create `components/copper/ask-copper.tsx`, and edit two files from Module 1: `app/page.tsx` (to render it) and `components/copper/site-header.tsx` (for the link).

| Part | What it is |
|---|---|
| Launcher | `data-testid="ask-copper-launcher"`, a floating button named "Ask Copper", bottom-right. Mount it from `app/page.tsx` (not `layout.tsx`), so it's part of the page the tests render |
| Panel | `data-testid="ask-copper"`, a shadcn `Sheet` on the right, titled "Ask Copper". `SheetContent` sets its own width, so override it for full width on phones |
| Opening it | The launcher, the header's **Ask Copper** link, or loading the site at `/#ask`. Watch the link: once the address already ends in `#ask`, clicking it again fires no `hashchange`, so listen for the click as well, or the link only works once |
| No AI key | The panel shows `<SetupRequired service="ai" />` instead of the chat. The panel is a client component and can't read the key itself, so `app/page.tsx` calls `isAiConfigured()` and passes the answer down as a prop |
| **Use tools** switch | Give it the accessible name "Use tools" (an `aria-label` is the reliable way) |
| Asking a question | A text box with an accessible name (for example `aria-label="Your question"`) and a **Send** button. Keep it to one text box, so "the chat box" is unambiguous |
| Starter questions | Three **starter questions** as buttons, worded exactly as below. Clicking one asks it straight away. An empty chat shows them in full. **They stay on offer after every answer**, under the conversation — it makes no difference whether the shopper clicked a starter or typed a question of their own, and it stays true on the third answer as much as the first. Hide them only while an answer is streaming, so nothing moves under the cursor mid-reply |

The three starter questions, word for word:

```
How much is Copper Home with Copper Plus, paid yearly, for 2 years?
Is Copper Notes in Night Sky in stock?
Is Copper Plus cheaper monthly or yearly?
```

They're the three questions this module is built around, so a shopper's first click is also the thing you try first.

**Two conversations, not one.** Tools on and tools off are separate chats. Flipping the switch swaps which one you see, and each sends only its own history. Otherwise the tools-off model just copies the answer the tools worked out, and the comparison proves nothing.

Keep the landing page a single page: no new pages or routes (Module 1's AC-1.4 still applies).

### 5. Showing the work

This section is the heart of the module. Anyone can build a chatbot that
answers; the thing worth learning is *how* it answered. So the panel narrates
the agent loop: what Copper could use, what it was thinking, what it asked the
app, what the app said, and only then the reply.

Build it as described here. The tests check only a few anchors (the tool card,
the words "What Copper sent" and "What came back", the total, and the
tools-off label), but a TA compares your panel with this description, so
follow it rather than inventing your own layout.

Draw each answer as a line of **stations** hanging off a vertical rail, in the
order they happened:

```
 ●  TOOLS COPPER CAN USE
 │    get_products   get_prices   calculate_cost   check_availability
 │                                ^^^^^^^^^^^^^^ filled in: the one it picked
 ●  COPPER IS THINKING
 │    │ Calculating the cost
 │    │ The shopper wants a 2-year total, so I'll use
 │    │ calculate_cost with products ['copper-home']…
 ●  COPPER IS CALLING A TOOL
 │    ┌ calculate_cost()        tool 1   Working out the cost ┐
 │    │ → WHAT COPPER SENT                                    │
 │    │    Products   Copper Home                             │
 │    │    Plan       Copper Plus                             │
 │    │    Billing    annual                                  │
 │    │    Years      2                                       │
 │    ├───────────────────────────────────────────────────────┤
 │    │ ← WHAT CAME BACK                                      │
 │    │    Copper Home                                $149.00 │
 │    │    Copper Plus, annual, 2 years               $158.00 │
 │    │    Total                                      $307.00 │
 │    └───────────────────────────────────────────────────────┘
 ●  Writing the answer…

    ┌ Copper ───────────────────────────────┐
    │ That comes to $307 over two years.    │
    └───────────────────────────────────────┘
```

**The rail.** A thin vertical line down the left of the answer, from the first
station to the last, in a gradient from Copper to Patina Teal (`from-primary
via-accent`). Each station hangs a round node on it: a small circle with an
icon, ringed in the panel's background colour so the rail appears to pass
behind it. Indent the station contents past the rail.

#### Station 1: Tools Copper can use

Label: **TOOLS COPPER CAN USE**, small, uppercase, letter-spaced. Under it, a
chip per tool name from `TOOL_LABELS`, in `font-mono`.

- A tool Copper **used** in this answer: filled Patina Teal, bold.
- A tool it didn't use: muted grey.

This station is the whole lesson in one line. A tool isn't magic: it's a short
menu the model is handed, and it picks from it. Students should be able to
point at this and say what a tool is.

#### Station 2: Copper is thinking

Node in Copper, with a brain icon. Label: **COPPER IS THINKING**. The summary
goes in `data-testid="thinking"`, italic and muted, behind a left border, and
grows as it streams. It arrives as markdown (`**headings**` and `` `code` ``),
so render those rather than printing the marks.

One thinking station per run of reasoning; if more arrives later in the answer,
start another station in its place in the order.

#### Station 3: Copper is calling a tool

Node in Patina Teal, with a wrench icon. Label **COPPER IS CALLING A TOOL**
while it runs, **COPPER CALLED A TOOL** once it's done. The card itself:

| Part | What it is |
|---|---|
| The card | `data-testid="tool-call"` and `data-tool="<tool name>"`, a bordered rounded box. **Always open** — nothing to click |
| Header strip | Patina Teal background. `calculate_cost()` in `font-mono` bold, a small `tool 1` chip counting the calls in this answer, and the plain-English label from `TOOL_LABELS` ("Working out the cost") on the right |
| **→ WHAT COPPER SENT** | The input as a labelled list: Products, Plan, Billing, Years — or Product, Color. Never raw JSON. `get_prices` and `get_products` have no input: write "Nothing, it just asked for the price list" and "Nothing, it just asked what Copper sells" |
| **← WHAT CAME BACK** | Separated from the input by a divider, on a faint teal background |

The arrows matter: they make it a round trip rather than two lists.

What goes under **What came back**, per tool:

| Tool | What to show |
|---|---|
| `calculate_cost` | One row per line with its price, then a divider and **Total** in large Copper type. Use `formatUsd()` |
| `get_products` | One block per product: its name with its price, its type in small grey text under it, then its colours as small teal pills |
| `get_prices` | Each product with its price, and each paid plan as "$7.99/mo · $79/yr" |
| `check_availability` | One row per colour with a coloured pill: **In stock** (teal), **Low stock** (Hard-Hat Yellow), **Back-ordered until Nov 14, 2026** (Sonoran Sunset). For `not_a_color`, a sentence naming the real colours. For `unavailable`, the message |

While the tool is still running, show "filling in the details…" under What
Copper sent (the model is still writing the input) and a small spinner with
"the app is running the code…" under What came back.

#### Station 4: What's happening now

Only while Copper is working. A pulsing node of three bouncing dots, no label,
and one line of text:

| When | Text |
|---|---|
| Nothing has happened yet | Reading your question… |
| Steps so far, but no reply yet | Deciding what to do next… |
| The reply has started | Writing the answer… |
| Tools are off, no reply yet | Answering from memory… |

#### The reply

Not a station: a chat bubble below the rail, on a card with a rounded corner
tucked toward the rail. A small Copper-coloured "Copper" label on top, then the
text, which types itself out as it streams with a blinking caret at the end.

With tools off, put a bordered Sonoran Sunset box above the text:

> ⚠ **Answered without tools: may be made up**
> With tools off, Copper can't see today's prices or stock. The AI only has
> what it learned in training, so it fills the gaps with guesses that sound
> right. That's a hallucination.

#### The tools-off chat

Same stations, which is what makes the comparison land, with three changes:

- The rail is Sonoran Sunset instead of Copper and Teal.
- Station 1 reads **TOOLS GIVEN TO COPPER: NONE**, the same four names struck
  through and muted, with the line "Copper has to answer from memory alone."
- The thinking node is Sonoran Sunset too.

There are no tool stations, because there are no tools. What students should
see is the thinking station admitting it is inventing the numbers, and the
reply stating them as fact a moment later.

#### The panel chrome

| Part | What it is |
|---|---|
| Header | Night Sky background. The Copper mascot in a Copper circle, the title "Ask Copper", and one line under it: "Prices, totals and stock, checked with tools." A close button on the right |
| Use tools row | Inside the header, on a faintly lighter strip: the label "Use tools", a hint reading "Checks every answer" or "Model guesses alone", and the switch |
| Body | Desert Sand (`bg-secondary`), scrolling, scrolled to the bottom as new steps arrive |
| Composer | Pinned at the bottom on white: a rounded text box and a round Copper send button with an up arrow |

Use the theme classes (`bg-primary`, `bg-accent`, `bg-secondary`,
`text-muted-foreground`, `bg-chart-3`, `bg-chart-4`), never hex values, so
Module 1's brand-colour check keeps passing.

## Acceptance criteria

Each criterion's ID matches its test in `specs/module-2/tests/`. Run `npm run check` to see which pass. Module 1's criteria still run too, so don't break the landing page.

### Part A: The chat widget
- **AC-M2.1** A floating **Ask Copper** launcher opens the panel; the panel is a dialog named "Ask Copper"; the three starter questions are offered as buttons and clicking one asks it, in an empty chat and again after every answer — including an answer to a question the shopper typed themselves (a second click carries the conversation so far); the header links to `#ask`; and loading the site at `/#ask` opens it.
- **AC-M2.2** Without an AI key, the panel shows the setup card, and no chat box.
- **AC-M2.3** A question shows the question and Copper's reply. **Use tools** is on by default and is sent with each question; a follow-up carries the earlier turns; turning tools off starts a separate chat that sends only its own history; turning it back on restores the first chat.
- **AC-M2.4** Each tool call shows as a `tool-call` card, open without a click, **before** Copper's reply, with the tool's name, "What Copper sent" and "What came back" (including each line and the total). A tools-off answer shows no tool cards and carries the "Answered without tools" label.

### Part B: The tools
- **AC-M2.5** `calculate_cost` gets the totals right (for example, Copper Home with Copper Plus paid yearly for 2 years is **$307**), and its lines add up to the total.
- **AC-M2.6** `calculate_cost` and `get_prices` follow the catalog: the test swaps in new prices and checks the answers change.
- **AC-M2.7** `calculate_cost` rejects input outside its contract (an unknown product or plan, 0 or 6 years, 1.5 years, more than 5 devices).
- **AC-M2.8** `get_products` returns every product with its colours, `get_prices` returns every product and plan, and `copperTools` has exactly the four tools, each with a description.
- **AC-M2.9** `check_availability` reads the stock list each time: in stock, low stock (under 10) or back-ordered with its restock date, for every color or just one, in any capitalization.
- **AC-M2.10** `check_availability` returns `"not_a_color"` (with the real colors) for a color the product doesn't come in, and `"unavailable"` with no stock levels when stock can't be read. Its input must be a Copper product.

### Part C: Streaming the answer
- **AC-M2.11** When the model asks for a tool, the tool runs, its result goes back to the model, and the finished `Progress` has the reply and the tool call.
- **AC-M2.12** The answer arrives in updates: a tool step appears with its name **before** its input is known, then turns `"done"`; Gemini's thought summary arrives as a `thinking` step; the reply builds up a piece at a time and never goes backwards; each update carries everything so far.
- **AC-M2.13** Each question is logged to `ai_calls` with module 2, feature `ask-copper` and whichever model answered. (`callStream` fills the model in; don't pin one.)
- **AC-M2.14** With **Use tools** off, the model gets no instructions and no tools; with it on, it gets all four.
- **AC-M2.15** `COPPER_INSTRUCTIONS` is written (no TODO, at least 40 words) and is sent to the model with the whole conversation.

### DEPLOY, AI-KEY and SUPABASE
- **DEPLOY** (10) Your app is live on Vercel and the live page shows "Ask Copper".
- **AI-KEY** (10) That live page shows the chat, not the setup card: the Google key is set in the Vercel project, not only in `.env.local`.
- **SUPABASE** (10, part 2) `readInventory()` reads the Supabase `inventory` table, `lib/copper/data/inventory.json` is gone, and a migration in `supabase/migrations/` creates the table.

## Part 2: live stock

Part 1 reads stock from `lib/copper/data/inventory.json`, which ships inside
the deployed app. Changing it means a commit and a deploy, so the live site
can only ever be as fresh as the last push. Part 2 fixes that.

| | Where stock lives | Who can change it | Takes effect |
|---|---|---|---|
| Part 1 | A file in the repo | A developer | After a deploy |
| Part 2 | A Supabase `inventory` table | Anyone with the Supabase login | On the next question |

What has to be true at the end of part 2:

- The `inventory` table exists in the student's own Supabase project, with the
  six rows from the Product Bible (Section 10). `supabase/migrations/` and
  `supabase/seed.sql` are in the starter; the student has Claude apply them
  through the Supabase MCP server rather than running database commands.
- `readInventory()` in `lib/copper/inventory.ts` reads that table, and keeps
  its contract exactly: `InventoryRow[]` when it works, `null` when it can't
  read. `check_availability` already answers "stock can't be checked" on
  `null`, so a missing key degrades instead of crashing.
- `lib/copper/data/inventory.json` is deleted.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set
  in `.env.local` and in Vercel.
- `npm run check` still passes **27 of 27**. No acceptance criterion changes in
  part 2: the tests replace the inventory module with a fake, so where stock
  really comes from is invisible to them.
- Changing a stock number in the Supabase table editor changes the deployed
  site's answer with no commit and no deploy.

Nothing else moves. Prices and colors stay in the catalog, because what a
product costs and what colors it comes in are facts that don't change daily.
Stock does.

## Non-goals

- No answers from documents (warranty, manuals, policies). That's Module 3.
- No memory between visits. Each page load starts fresh.
- No actions with side effects: no orders, reservations, refunds or sign-ups. The tools only read.
- No new pages, routes or UI libraries. In part 1 there is no database either: stock comes from the starter's stock list. Part 2 moves stock into a Supabase table and changes nothing else.
- Don't edit `lib/copper/catalog.ts`, `lib/copper/inventory.ts`, their data in `lib/copper/data/`, or the tests in `specs/*/tests/` — except in part 2, which rewrites `readInventory()` and deletes the stock file.

## How it's graded

| Part | Points | How |
|---|---|---|
| Part A: the chat widget (AC-M2.1 to AC-M2.4) | 20 | Tests |
| Part B: the tools (AC-M2.5 to AC-M2.10) | 30 | Tests |
| Part C: streaming (AC-M2.11 to AC-M2.15) | 25 | Tests (with a fake model and database, so no keys or cost) |
| DEPLOY | 10 | The grader loads your live site |
| AI-KEY | 10 | The live site shows the chat, not the setup card |
| SUPABASE | 10 | Stock reads from the Supabase table (part 2) |

`specs/module-2/rubric.md` has the full list.
