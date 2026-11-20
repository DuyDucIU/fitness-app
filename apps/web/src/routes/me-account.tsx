import * as React from 'react';

import { useAuth, useAuthApi } from '@/auth/auth-context';
import { ReauthBanner } from '@/auth/reauth-banner';
import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { GoogleIcon } from '@/components/google-icon';
import {
  ChevronIcon,
  LogoutIcon,
  MailIcon,
  TrashIcon,
} from '@/components/icons';
import { SyncPill } from '@/components/sync-pill';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useComingSoon } from '@/hooks/use-coming-soon';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { m } from '@/paraglide/messages.js';

/**
 * Sheet xác nhận đăng xuất (prototypes/me › signout). Còn thay đổi chưa đồng bộ thì
 * cảnh báo sẽ mất chúng, vì đăng xuất xoá dữ liệu trên máy (ADR 0001).
 */
function SignOutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const auth = useAuthApi();
  const toast = useToast();
  const { pending } = useSyncStatus();
  const [busy, setBusy] = React.useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await auth.signOut();
      toast.show(m.signed_out());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {pending ? m.sign_out_pending_title() : m.sign_out_title()}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <p className="pb-2">
            {pending
              ? m.sign_out_pending_body({ count: pending })
              : m.sign_out_synced()}
          </p>
        </SheetBody>
        <SheetFooter>
          {pending ? (
            <>
              <SheetClose asChild>
                <Button size="wide">{m.sign_out_stay()}</Button>
              </SheetClose>
              <Button variant="line" size="wide" busy={busy} onClick={signOut}>
                {m.sign_out_anyway()}
              </Button>
            </>
          ) : (
            <>
              <Button size="wide" busy={busy} onClick={signOut}>
                {m.sign_out_confirm()}
              </Button>
              <SheetClose asChild>
                <Button variant="line" size="wide">
                  {m.common_cancel()}
                </Button>
              </SheetClose>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Me › Account (prototypes/me › account): tài khoản, đăng xuất, xoá tài khoản (chưa làm). */
export function AccountPage() {
  const state = useAuth();
  const comingSoon = useComingSoon();
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  // RequireOwner đảm bảo máy có chủ; `signed-out` chỉ thoáng qua lúc vừa đăng xuất.
  if (state.status !== 'signed-in' && state.status !== 'reauth-needed')
    return null;
  const { user } = state;
  const google = user.provider === 'google';

  return (
    <AppShell
      top={<TopBar title={m.me_account()} backTo="/me" right={<SyncPill />} />}
      banner={<ReauthBanner />}
      foot={<Foot />}
    >
      <Block>
        <Row>
          {google ? (
            <GoogleIcon className="size-5 flex-none" />
          ) : (
            <MailIcon className="size-5 flex-none" aria-hidden />
          )}
          <RowTitle
            sub={
              google
                ? m.account_signed_in_with_google()
                : m.account_signed_in_with_email()
            }
          >
            {user.email}
          </RowTitle>
        </Row>
        <Row asChild>
          <button type="button" onClick={() => setSignOutOpen(true)}>
            <LogoutIcon className="size-5 flex-none" aria-hidden />
            <RowTitle sub={m.account_sign_out_sub()}>
              {m.account_sign_out()}
            </RowTitle>
          </button>
        </Row>
      </Block>
      <SectionHeading>{m.account_delete_heading()}</SectionHeading>
      <Block>
        <Row asChild tone="danger">
          <button type="button" onClick={comingSoon}>
            <TrashIcon className="size-5 flex-none" aria-hidden />
            <RowTitle sub={m.account_delete_sub()}>
              {m.account_delete()}
            </RowTitle>
            <RowEnd>
              <ChevronIcon className="-mr-1 size-5" aria-hidden />
            </RowEnd>
          </button>
        </Row>
      </Block>
      <SignOutSheet open={signOutOpen} onOpenChange={setSignOutOpen} />
    </AppShell>
  );
}
