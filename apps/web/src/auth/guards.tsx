import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';

import { useAuth } from './auth-context';
import { safeNext } from './next';

/**
 * Layout của các màn trong app: vào được khi có phiên *hoặc* máy đã có chủ
 * (`reauth-needed` vẫn dùng app bình thường — ADR 0001). Máy chưa có chủ thì sang
 * màn đăng nhập, nhớ trang đang mở để quay lại.
 */
export function RequireOwner() {
  const state = useAuth();
  const location = useLocation();
  if (state.status === 'signed-out') {
    const next = location.pathname + location.search;
    // Vừa đăng xuất: người đăng nhập tiếp theo có thể là người khác, không giữ trang cũ.
    const search =
      next === '/' || state.afterSignOut
        ? ''
        : `?next=${encodeURIComponent(next)}`;
    return <Navigate to={`/sign-in${search}`} replace />;
  }
  return <Outlet />;
}

/**
 * Layout của màn đăng nhập/đăng ký: đã có phiên thì về trang `next` (mặc định Today).
 * Chưa đọc xong phiên (`sessionPending`) thì ở lại: có thể hoá ra mất phiên, đúng lúc
 * user mở màn này để đăng nhập lại.
 */
export function PublicOnly() {
  const state = useAuth();
  const [params] = useSearchParams();
  if (state.status === 'signed-in' && !state.sessionPending) {
    return <Navigate to={safeNext(params.get('next'))} replace />;
  }
  return <Outlet />;
}
