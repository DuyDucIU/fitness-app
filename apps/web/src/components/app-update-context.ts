import * as React from 'react';

export interface AppUpdate {
  /** Service worker mới đã tải xong, chờ user đồng ý (registerType: 'prompt', SDD 3.3). */
  ready: boolean;
  /** Kích hoạt bản mới và tải lại app. */
  update: () => void;
}

export const AppUpdateContext = React.createContext<AppUpdate>({
  ready: false,
  update: () => undefined,
});

export function useAppUpdate(): AppUpdate {
  return React.useContext(AppUpdateContext);
}
