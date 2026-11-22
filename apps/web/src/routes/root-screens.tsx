import type * as React from 'react';
import { Link } from 'react-router';

import { ownerOf } from '@/auth/auth';
import { useAuth } from '@/auth/auth-context';
import { ReauthBanner } from '@/auth/reauth-banner';
import { useCatalog } from '@/catalog/use-catalog';
import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { UpdateBanner } from '@/components/app-update';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { MeIcon, SearchIcon } from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SyncPill } from '@/components/sync-pill';
import { m } from '@/paraglide/messages.js';

/**
 * Khung chung của 5 màn gốc (thanh trên có chip đồng bộ + thanh tab). Nội dung từng màn
 * dựng theo prototypes/<màn> khi làm tính năng tương ứng.
 */
function RootScreen({
  title,
  banner,
  children,
}: {
  title: string;
  banner?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <AppShell
      top={<TopBar title={title} right={<SyncPill />} />}
      banner={
        <>
          <ReauthBanner />
          {banner}
        </>
      }
      foot={<Foot tabs />}
    >
      {children}
    </AppShell>
  );
}

export function TodayPage() {
  return <RootScreen title={m.nav_today()} banner={<UpdateBanner />} />;
}

export function PlansPage() {
  // Đếm như danh sách trong thư viện: không tính bài đã lưu trữ.
  const count = useCatalog()?.filter((e) => !e.isArchived).length;
  return (
    <RootScreen title={m.nav_plans()}>
      <SectionHeading>{m.plans_exercises_heading()}</SectionHeading>
      <Block>
        <Row asChild>
          <Link to="/plans/exercises">
            <SearchIcon className="size-5 flex-none" aria-hidden />
            <RowTitle
              sub={count ? m.plans_library_count({ count }) : undefined}
            >
              {m.plans_library_title()}
            </RowTitle>
            <RowEnd chevron />
          </Link>
        </Row>
      </Block>
    </RootScreen>
  );
}

export function HistoryPage() {
  return <RootScreen title={m.nav_history()} />;
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
