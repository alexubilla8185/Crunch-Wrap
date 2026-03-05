# INTELLIGENCE v2

## ENGINE
**Google Gemini 3.0 Flash**

## DATA EXTRACTION
Strict structured JSON enforcing the following schema:
- `summary`
- `highlights`
- `action_items`
- `topics`
- `sentiment`
- `reading_time`

## CHAT PHILOSOPHY
- **Explicit Rejection of Global RAG**: We reject Global RAG (Retrieval-Augmented Generation) due to token cost and hallucination risk.
- **Contextual Chat Drawers**: We use Contextual Chat Drawers, grounding the AI strictly in the raw text of the single active document.

## BACKGROUND ORCHESTRATOR
- **Polling Engine**: Processes local files via exponential backoff.
