import { Link, useLocation } from 'react-router';

import { Banner } from '@/components/banner';
import { LockIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';

import { useAuth } from './auth-context';

/**
 * Banner khi máy có chủ nhưng mất phiên (ADR 0001): không chặn thao tác, user tự chọn
 * lúc đăng nhập lại (vd sau khi tập xong); đăng nhập xong quay về đúng trang này.
 */
export function ReauthBanner() {
  const state = useAuth();
  const location = useLocation();
  if (state.status !== 'reauth-needed') return null;
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <Banner
      icon={<LockIcon aria-hidden />}
      title={m.reauth_title()}
      action={
        <Button asChild variant="text" className="-my-1.5">
          <Link to={`/sign-in?next=${next}`}>{m.reauth_action()}</Link>
        </Button>
      }
    >
      {m.reauth_body()}
    </Banner>
  );
}
