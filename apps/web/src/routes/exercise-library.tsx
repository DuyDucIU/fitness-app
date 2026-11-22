import { ExerciseSearch } from '@/catalog/exercise-search';
import { AppShell, TopBar } from '@/components/app-shell';
import { SyncPill } from '@/components/sync-pill';
import { m } from '@/paraglide/messages.js';

/** Plans › Thư viện bài tập (prototypes/plans › exercises): tìm bài trên catalog trên máy. */
export function ExerciseLibraryPage() {
  return (
    <AppShell
      top={
        <TopBar
          title={m.plans_exercises_heading()}
          backTo="/plans"
          right={<SyncPill />}
        />
      }
    >
      <ExerciseSearch />
    </AppShell>
  );
}
