# ARCHITECTURE v2

## CORE PHILOSOPHY
**Local-First. Zero-Latency. Edge-Optimized.**

## DATA LAYER
- **IndexedDB**: Strict use of IndexedDB via custom `localDbService` for all notes and audio.
- **Zero Cloud Dependency**: Core features operate entirely independent of cloud databases.

## AUTHENTICATION
- **Supabase Auth**: Strictly for user sessions and identity.
- **Decoupled**: Authentication is completely isolated from the local data layer.

## STATE MANAGEMENT
- **Zustand**: Global UI state (Toasts, AI Preferences).
- **Local React State**: Component-level UI.
- **Deprecated**: TanStack Query is removed due to zero-latency local data.

## ROUTING
- **Next.js 15 App Router**: Strict use of `app/dashboard/...` and `app/api/...` (for secure serverless functions).
- **Constraint**: No Next.js 14 pages router logic.

## STATE MACHINE
Processing statuses are strictly enforced:
`local` -> `uploading` -> `analyzing` -> `completed` -> `failed`
