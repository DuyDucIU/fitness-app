import * as React from 'react';
import { Link, useNavigate } from 'react-router';

import { ownerOf } from '@/auth/auth';
import { useAuth } from '@/auth/auth-context';
import { ReauthBanner } from '@/auth/reauth-banner';
import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { UpdateBanner } from '@/components/app-update';
import { Bib, BibBand } from '@/components/bib';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { EmptyState } from '@/components/empty-state';
import { MeIcon } from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SyncPill } from '@/components/sync-pill';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages.js';
import { startFreestyle, useOpenSession } from '@/workout/session';
import { WORKOUT_PATH, WorkoutResumeBar } from '@/workout/workout-resume-bar';

/**
 * Khung chung của 5 màn gốc (thanh trên có chip đồng bộ, thanh tiếp tục buổi tập khi có
 * buổi đang dở, thanh tab). Nội dung từng màn dựng theo prototypes/<màn> khi làm tính
 * năng tương ứng.
 */
export function RootScreen({
  title,
  banner,
  dock,
  children,
}: {
  title: string;
  banner?: React.ReactNode;
  dock?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <AppShell
      top={<TopBar title={title} right={<SyncPill />} />}
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

/**
 * Today (prototypes/home). Chưa có routine nên chỉ có tấm "chưa có lịch tập" và nút tập
 * tự do; có buổi đang dở thì nút đổi thành tiếp tục buổi đó.
 */
export function TodayPage() {
  const open = useOpenSession();
  const navigate = useNavigate();
  const [starting, setStarting] = React.useState(false);

  async function start() {
    setStarting(true);
    try {
      await startFreestyle();
      await navigate(WORKOUT_PATH);
    } finally {
      setStarting(false);
    }
  }

  let dock: React.ReactNode = null;
  if (open) {
    dock = (
      <Button asChild variant="orange" size="go">
        <Link to={WORKOUT_PATH}>{m.home_resume_workout()}</Link>
      </Button>
    );
  } else if (open === null) {
    dock = (
      <Button variant="ink" size="go" busy={starting} onClick={start}>
        {m.home_start_freestyle()}
      </Button>
    );
  }

  return (
    <RootScreen
      title={m.nav_today()}
      banner={<UpdateBanner workoutInProgress={!!open} />}
      dock={dock}
    >
      <Bib>
        <BibBand open>{m.home_no_routine()}</BibBand>
        <EmptyState stat={0}>{m.home_no_routine_body()}</EmptyState>
      </Bib>
    </RootScreen>
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
