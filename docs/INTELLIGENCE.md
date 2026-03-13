# ?? AI & Reasoning Engine
**Engine:** Google Gemini 3.1 Series
**Philosophy:** Dense Signal, Zero Fluff

## 1. Dynamic Model Selection
The system intelligently routes prompts based on task complexity and file size.
* **The Sprinter (gemini-3.1-flash-lite-preview):** Used for the vast majority of standard audio transcriptions, document parsing, and rapid data crunching. Highly cost-effective and sub-3-second latency.
* **The Analyst (gemini-3.1-pro-preview):** Used for deep reasoning, complex logic extraction, and massive context windows (long meetings).

## 2. Strict Structured Output (JSON)
We enforce strict JSON schemas for all AI generations. The UI relies absolutely on the API returning this exact object structure in a single payload:
* `title`: A punchy, 3-6 word accurate title.
* `summary`: Dense Executive Recap text. Direct facts, no "In this meeting..." fluff.
* `highlights`: Array of extracted core facts (strings).
* `action_items`: Array of detected next steps/tasks (strings).
* `topics`: Categorical string tags.

## 3. Truth-First Reasoning
Our intelligence engine is explicitly prompted to be honest and objective. If a decision wasn't made, the AI explicitly states "No decision detected." We prioritize Accuracy over Politeness.