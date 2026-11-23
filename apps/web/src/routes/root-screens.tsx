import * as React from 'react';
import { Link } from 'react-router';

import { ownerOf } from '@/auth/auth';
import { useAuth } from '@/auth/auth-context';
import { ReauthBanner } from '@/auth/reauth-banner';
import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { MeIcon } from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SyncPill } from '@/components/sync-pill';
import { m } from '@/paraglide/messages.js';
import { WorkoutResumeBar } from '@/workout/workout-resume-bar';

/**
 * Khung chung của 5 màn gốc (thanh trên có chip đồng bộ, thanh tiếp tục buổi tập khi có
 * buổi đang dở, thanh tab). Nội dung từng màn dựng theo prototypes/<màn> khi làm tính
 * năng tương ứng.
 */
export function RootScreen({
  title,
  sub,
  banner,
  dock,
  children,
}: {
  title: string;
  /** Dòng phụ dưới tiêu đề, vd ngày hôm nay ở Today. */
  sub?: string;
  banner?: React.ReactNode;
  dock?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <AppShell
      top={<TopBar title={title} sub={sub} right={<SyncPill />} />}
      banner={
        <>
          <ReauthBanner />
          <WorkoutResumeBar />
          {banner}
        </>
      }
      foot={<Foot tabs dock={dock} />}
    >
      {children}
    </AppShell>
  );
}

export function ProgressPage() {
  return <RootScreen title={m.nav_progress()} />;
}

export function MePage() {
  const state = useAuth();
  const email = ownerOf(state)?.email;
  return (
    <RootScreen title={m.nav_me()}>
      <Block>
        <Row asChild>
          <Link to="/me/account">
            <MeIcon className="size-5 flex-none" aria-hidden />
            <RowTitle sub={email}>{m.me_account()}</RowTitle>
            <RowEnd chevron />
          </Link>
        </Row>
      </Block>
      <SectionHeading>{m.me_language()}</SectionHeading>
      <Block pad>
        <LanguageSwitcher />
      </Block>
    </RootScreen>
  );
}
