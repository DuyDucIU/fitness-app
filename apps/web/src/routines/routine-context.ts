import * as React from 'react';

import type { RoutineSync } from '@/routines/routine-sync';

export const RoutineSyncContext = React.createContext<RoutineSync | null>(null);

export function useRoutineSync(): RoutineSync {
  const ctx = React.useContext(RoutineSyncContext);
  if (!ctx) throw new Error('useRoutineSync phải nằm trong RoutineSyncContext');
  return ctx;
}
