# Module 2: rubric

| Criterion | Points | Graded by | Description |
|---|---|---|---|
| AC-M2.1 | 5 | auto | The launcher opens the panel, which keeps offering the three starter questions after every answer, typed or clicked; the header link and /#ask open it too |
| AC-M2.2 | 5 | auto | Without an AI key, the panel shows the setup card |
| AC-M2.3 | 5 | auto | A question shows Copper's reply; the Use tools switch and the conversation are sent with each question |
| AC-M2.4 | 5 | auto | Each tool call shows as an open card before the reply (tool, what Copper sent, what came back); tool-less answers are labeled |
| AC-M2.5 | 5 | auto | calculate_cost gets the totals right |
| AC-M2.6 | 5 | auto | calculate_cost and get_prices follow the catalog when prices change |
| AC-M2.7 | 5 | auto | calculate_cost rejects input outside its contract |
| AC-M2.8 | 5 | auto | get_products and get_prices return the catalog; all four tools are described for the model |
| AC-M2.9 | 5 | auto | check_availability reads the stock list (in stock, low stock, back-ordered with date) |
| AC-M2.10 | 5 | auto | check_availability handles a color that doesn't exist, and stock it can't read, without guessing |
| AC-M2.11 | 5 | auto | When the model calls a tool, the tool runs and the reply comes back with the tool call |
| AC-M2.12 | 5 | auto | The answer streams in: thinking, tool calls, then the reply, each update carrying everything so far |
| AC-M2.13 | 5 | auto | Each question is logged to ai_calls (module 2, ask-copper, whichever model answered) |
| AC-M2.14 | 5 | auto | Use tools off sends no instructions and no tools; on sends all four |
| AC-M2.15 | 5 | auto | Copper's instructions are written and sent with the conversation |
| DEPLOY | 10 | auto | The live Vercel site shows the Ask Copper launcher |
| AI-KEY | 10 | auto | The live site has a Google AI key: it shows the chat, not the setup card |
| SUPABASE | 10 | auto | Stock reads from the Supabase inventory table; the JSON file is gone (part 2) |
