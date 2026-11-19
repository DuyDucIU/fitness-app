import type * as React from 'react';

import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { Block } from '@/components/block';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SyncPill } from '@/components/sync-pill';
import { m } from '@/paraglide/messages.js';

/**
 * Khung chung của 5 màn gốc (thanh trên có chip đồng bộ + thanh tab). Nội dung từng màn
 * dựng theo prototypes/<màn> khi làm tính năng tương ứng.
 */
function RootScreen({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <AppShell
      top={<TopBar title={title} right={<SyncPill />} />}
      foot={<Foot tabs />}
    >
      {children}
    </AppShell>
  );
}

export function TodayPage() {
  return <RootScreen title={m.nav_today()} />;
}

export function PlansPage() {
  return <RootScreen title={m.nav_plans()} />;
}

export function HistoryPage() {
  return <RootScreen title={m.nav_history()} />;
}

export function ProgressPage() {
  return <RootScreen title={m.nav_progress()} />;
}

export function MePage() {
  return (
    <RootScreen title={m.nav_me()}>
      <SectionHeading>{m.me_language()}</SectionHeading>
      <Block pad>
        <LanguageSwitcher />
      </Block>
    </RootScreen>
  );
}
