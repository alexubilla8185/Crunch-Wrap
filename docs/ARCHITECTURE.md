# 🏗️ System Architecture
**Status:** Canonical :: V3 Next.js App Router (Edge Optimized)
**Structure:** Edge-Computed, Native-Compressed, Atomic State

## 1. The Stack
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS v4 (Strict CSS Variable M3 Implementation)
* **Language:** TypeScript
* **Validation:** Zod (Strict runtime validation before network requests)

## 2. The State Engine (The Foreground Fast-Track)
We use a high-performance, foreground-first orchestration model to eliminate background syncing delays.
* **Atomic Cache Updates:** TanStack Query is used to manage server state. We strictly enforce `ReactDOM.unstable_batchedUpdates` when slamming the fully-formed AI payload into the cache to prevent React UI flickering.
* **Skeleton Killswitch:** Loading skeletons are strictly tied to the `uploading` and `analyzing` states and are destroyed instantly the millisecond the `completed` status is achieved.

## 3. The Data Flow (Cost-Optimized & Edge-Fast)
* **Native Audio Compression:** We capture audio using the browser's native `MediaRecorder` (`.webm` for Chrome/Android, `.mp4` for iOS) to keep file sizes 90% smaller than `.wav`, drastically saving Supabase storage costs.
* **JIT (Just-In-Time) Media:** The Audio Player remains locked and silent until the user explicitly clicks play, at which point it fetches a secure Signed URL, saving bandwidth.
* **The Edge Pipeline:** `/api/analyze` runs on the Edge Runtime, communicating directly with Gemini and Supabase, bypassing cold starts and delivering complete JSON payloads in 1.9 - 3.6 seconds.

## 4. Database Structure (Supabase PostgreSQL)
* `profiles`: User identification and settings.
* `insights`: The core document entity.
* `storage`: Private buckets utilizing Row Level Security (RLS) and Signed URLs.