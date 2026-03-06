# 🏗️ System Architecture
**Status:** Canonical :: V2 Next.js Standard
**Structure:** Local-First, Cloud-Secure

## 1. The Stack
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS
* **Language:** TypeScript
* **Validation:** Zod (Strict runtime validation before network requests)

## 2. The State Engine (Decoupled)
We maintain a strict boundary between Server State and Client UI State to prevent redundant rendering and UI freezes.
* **Server/Real-Time State (TanStack Query):** Owns all asynchronous data. It connects to Supabase Realtime via WebSockets to fetch, cache, and mutate data. UI components subscribe directly to these hooks for zero-refresh updates.
* **Client UI State (Zustand):** Owns ephemeral interface data (e.g., active filters, open modals, live audio recording state). It does *not* cache database payloads.

## 3. The Data Flow (Store First, Analyze Second)
* **Local-First Safety:** Audio captured or dropped into the app is immediately saved to `IndexedDB`. This guarantees data safety if the user's network drops before the cloud upload finishes.
* **Direct-to-Cloud Upload:** Audio (MP3/WEBM, Max 50MB) bypasses the Next.js API. The client requests a Signed URL and uploads directly to a private Supabase storage bucket to prevent server timeouts.
* **AI Processing:** Next.js API server routes (`/api/analyze`) securely trigger the Google Gemini API in the background.

## 4. Database Structure (Supabase PostgreSQL)
* `profiles`: User identification and settings.
* `insights`: The core note entity, tracking `processing_status`.
* `summaries`: The structured AI output linked to the insight.