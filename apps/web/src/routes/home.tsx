import { m } from '@/paraglide/messages.js';

/** Màn Today (tạm). Dựng lại theo prototypes/home khi làm tính năng. */
export function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[env(safe-area-inset-top)]">
      <h1 className="pt-6 text-read font-bold">{m.nav_today()}</h1>
    </main>
  );
}
