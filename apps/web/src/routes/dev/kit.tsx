import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AppShell, Foot, SectionHeading, TopBar } from '@/components/app-shell';
import { Block, Row, RowEnd, RowTitle, RowValue } from '@/components/block';
import { Chip, ChipRow } from '@/components/chip';
import { Segmented, Stepper, SwitchRow } from '@/components/controls';
import { Alert, EmptyState } from '@/components/empty-state';
import { Field, NumberInput, SearchInput, TextInput } from '@/components/field';
import { Banner } from '@/components/banner';
import {
  AlertIcon,
  DownloadIcon,
  MoreIcon,
  PlusIcon,
} from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SyncPill, SyncPillView } from '@/components/sync-pill';
import { useToast } from '@/components/toast-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import {
  formatLongDate,
  formatNumber,
  formatShortDate,
  formatTime,
} from '@/lib/format';
import { getLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

/*
 * /dev/kit — chỉ có khi dev (router không khai báo route này ở bản build production).
 * Hiển thị mọi primitive với chữ thật của cả hai ngôn ngữ để soát dấu tiếng Việt và độ
 * dài chữ (SDD 3.5). Nhãn mô tả và dữ liệu mẫu ở đây là chữ cho dev, không qua message
 * (ESLint bỏ qua thư mục src/routes/dev).
 */

const now = new Date();

export function Component() {
  const toast = useToast();
  const sync = useSyncStatus();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const [weight, setWeight] = useState<number | null>(77.5);
  const [reps, setReps] = useState(8);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [goal, setGoal] = useState('strength');
  const [rpe, setRpe] = useState(true);
  const [filter, setFilter] = useState('all');

  return (
    <AppShell
      top={
        <TopBar
          title="Design kit"
          sub={`Locale: ${getLocale()}`}
          backTo="/"
          right={<SyncPill />}
        />
      }
      foot={
        <Foot
          tabs
          dock={
            <Button variant="orange" size="go">
              {m.common_save()}
            </Button>
          }
        />
      }
    >
      <SectionHeading>Ngôn ngữ / Language</SectionHeading>
      <Block pad>
        <LanguageSwitcher />
      </Block>

      <SectionHeading>Banner</SectionHeading>
      <Banner
        className="mx-0"
        icon={<DownloadIcon aria-hidden />}
        title={m.app_update_title()}
        action={<Button>{m.common_update()}</Button>}
      >
        {m.app_update_body()}
      </Banner>

      <SectionHeading>Hạ tầng</SectionHeading>
      <Block>
        <Row>
          <RowTitle
            sub={
              health.isPending
                ? m.common_loading()
                : health.isError
                  ? errorMessage(health.error)
                  : health.data.status
            }
          >
            API · GET /v1/health
          </RowTitle>
        </Row>
        <Row>
          <RowTitle sub="IndexedDB outbox">Pending</RowTitle>
          <RowValue>{formatNumber(sync.pending)}</RowValue>
        </Row>
      </Block>

      <SectionHeading>Định dạng</SectionHeading>
      <Block>
        <Row>
          <RowTitle sub="formatNumber(77.5)">Number</RowTitle>
          <RowValue>{formatNumber(77.5)}</RowValue>
        </Row>
        <Row>
          <RowTitle sub={formatLongDate(now)}>Date</RowTitle>
          <RowEnd>
            {formatShortDate(now)} · {formatTime(now)}
          </RowEnd>
        </Row>
      </Block>

      <SectionHeading>Button</SectionHeading>
      <Block pad className="flex flex-wrap gap-2">
        <Button>{m.common_save()}</Button>
        <Button variant="line">{m.common_cancel()}</Button>
        <Button variant="orange">{m.common_update()}</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="text">Write my own instead</Button>
        <Button busy>{m.common_update()}</Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.common_more_options()}
        >
          <MoreIcon />
        </Button>
        <Button size="wide" disabled>
          {m.common_retry()}
        </Button>
        <Button variant="ink" size="go">
          Finish
        </Button>
        <Button variant="line" size="go">
          Skip rest
        </Button>
      </Block>

      <SectionHeading>Sync pill</SectionHeading>
      <Block pad className="flex flex-wrap gap-2">
        <SyncPillView online pending={0} />
        <SyncPillView online pending={3} />
        <SyncPillView online pending={3} syncing />
        <SyncPillView online={false} pending={0} />
        <SyncPillView online={false} pending={1} />
        <SyncPillView online={false} pending={5} />
      </Block>

      <SectionHeading>Rows</SectionHeading>
      <Block>
        <Row asChild>
          <button type="button">
            <RowTitle sub="3 × 5 · 80 kg">Barbell squat</RowTitle>
            <RowEnd chevron />
          </button>
        </Row>
        <Row tone="current">
          <RowTitle sub="Current">Bench press</RowTitle>
          <RowValue>{formatNumber(62.5)}</RowValue>
        </Row>
        <Row tone="inverse">
          <RowTitle sub="PR">Deadlift</RowTitle>
          <RowValue>{formatNumber(142.5)}</RowValue>
        </Row>
        <Row tone="danger" asChild>
          <button type="button">Delete workout</button>
        </Row>
        <Row tone="add" asChild>
          <button type="button">
            <PlusIcon className="size-5" aria-hidden />
            Add set
          </button>
        </Row>
      </Block>

      <SectionHeading>Chips</SectionHeading>
      <ChipRow>
        {['all', 'chest', 'back', 'legs', 'shoulders', 'arms'].map((c) => (
          <Chip key={c} pressed={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
        <Chip current>Today</Chip>
        <Chip dashed>Whole session</Chip>
      </ChipRow>

      <SectionHeading>Fields</SectionHeading>
      <Block pad>
        <Field label="Weight" help="Typing 77,5 or 77.5 both work.">
          <NumberInput value={weight} onValueChange={setWeight} />
        </Field>
        <Field label="Name" error="Name is required">
          <TextInput placeholder="Full body A" />
        </Field>
        <Field label={m.common_search()}>
          <SearchInput placeholder={m.common_search()} />
        </Field>
      </Block>

      <SectionHeading>Controls</SectionHeading>
      <Block pad className="space-y-4">
        <Segmented
          aria-label="Unit"
          value={unit}
          onValueChange={setUnit}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
        />
        <Segmented
          stack
          aria-label="Goal"
          value={goal}
          onValueChange={setGoal}
          options={[
            { value: 'strength', label: 'Strength', sub: '3–6 reps' },
            { value: 'size', label: 'Muscle size', sub: '8–12 reps' },
          ]}
        />
        <SwitchRow
          label="RPE"
          sub="Rate each set from 6 to 10"
          checked={rpe}
          onCheckedChange={setRpe}
        />
        <Stepper aria-label="Reps" value={reps} onValueChange={setReps} />
      </Block>

      <SectionHeading>Sheet · Toast</SectionHeading>
      <Block pad className="flex flex-wrap gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="line">Open sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Exercise settings</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <Field label="Weight">
                <NumberInput value={weight} onValueChange={setWeight} />
              </Field>
            </SheetBody>
            <SheetFooter>
              <Button size="wide">{m.common_save()}</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button
          variant="line"
          onClick={() =>
            toast.show('Set deleted', {
              action: { label: 'Undo', onClick: () => undefined },
            })
          }
        >
          Show toast
        </Button>
      </Block>

      <SectionHeading>Empty · Alert</SectionHeading>
      <Block>
        <EmptyState stat="0" action={<Button>Start</Button>}>
          No workouts yet this week.
        </EmptyState>
      </Block>
      <Alert icon={<AlertIcon className="size-5" />} title={m.error_unknown()}>
        {m.error_network()}
      </Alert>
    </AppShell>
  );
}
