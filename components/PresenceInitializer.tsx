'use client';

import { usePresence } from '@/hooks/usePresence';

export default function PresenceInitializer({ email }: { email: string }) {
  usePresence(email);
  return null;
}
