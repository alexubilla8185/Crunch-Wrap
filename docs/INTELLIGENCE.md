# 🧠 AI & Reasoning
**Engine:** Google Gemini 3 & 2.5 Series
**Philosophy:** Fact-Grounded Reasoning

## 1. Dynamic Model Selection
The system uses a UI-controlled "Deep Analysis" toggle to route to the most cost-effective and capable model.
* **Standard Recap:** Routes to `gemini-3-flash` for high-speed, standard meeting transcription and summarization.
* **Deep Analysis:** Routes to `gemini-3-pro` for high-reasoning, complex logic extraction, and meetings longer than 15 minutes.
* **Realtime Assistant (Future):** Routes to `gemini-2.5-flash-native-audio` for ultra-low latency voice interactions.

## 2. Auto-Recovery (Self-Healing)
The system implements a robust Auto-Recovery method via background TanStack Query hooks.
* **Health Check:** Automatically detects if a note has been stuck in the `analyzing` state for > 10 minutes.
* **Repair:** If detected, it marks the status as `failed` and surfaces a "Retry" button to the user, ensuring API timeouts do not result in permanently dead UI states.

## 3. Structured Output
We enforce strict JSON schemas for all AI generation to ensure UI consistency:
* `summary`: Dense Executive Recap text (Markdown).
* `highlights`: Array of extracted core facts.
* `action_items`: Array of detected next steps.
* `topics`: Categorical string tags.
* `sentiment`: Enforced string (POSITIVE, NEUTRAL, NEGATIVE, or COMPLEX).