import * as React from 'react';

import type { Auth, AuthState } from './auth';

export const AuthContext = React.createContext<Auth | null>(null);

/** Module auth của app (đăng nhập, đăng ký, đăng xuất). */
export function useAuthApi(): Auth {
  const auth = React.useContext(AuthContext);
  if (!auth) throw new Error('useAuthApi phải nằm trong <AuthContext>');
  return auth;
}

/** Trạng thái đăng nhập hiện tại, tự render lại khi đổi. */
export function useAuth(): AuthState {
  const auth = useAuthApi();
  return React.useSyncExternalStore(auth.subscribe, auth.getState);
}
