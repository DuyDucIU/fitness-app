import type { CatalogExercise } from '@fitness/contract';
import type { ExerciseMatch } from '@fitness/engine';
import * as React from 'react';

import {
  equipmentLabel,
  exerciseNames,
  primaryMuscles,
} from '@/catalog/display';
import { useExerciseSearch } from '@/catalog/use-catalog';
import { Block, Row, RowEnd, RowTitle } from '@/components/block';
import { EmptyState } from '@/components/empty-state';
import { SearchInput } from '@/components/field';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getLocale } from '@/lib/i18n';
import { m } from '@/paraglide/messages.js';

/** Nội dung một kết quả: tên theo ngôn ngữ UI, dòng phụ là tên còn lại, dụng cụ, nhóm cơ. */
function ExerciseResult({
  match: { exercise, ownAlias },
}: {
  match: ExerciseMatch<CatalogExercise>;
}) {
  const locale = getLocale();
  const { name, other } = exerciseNames(exercise, locale);
  const details = [
    exercise.equipment && equipmentLabel(exercise.equipment),
    primaryMuscles(exercise, locale).join(', '),
    ownAlias && m.plans_library_your_name({ alias: ownAlias }),
  ].filter(Boolean);
  return (
    <>
      <RowTitle
        sub={
          <>
            {other && <span lang={locale === 'vi' ? 'en' : 'vi'}>{other}</span>}
            {other && details.length > 0 && ' · '}
            {details.length > 0 && <span>{details.join(' · ')}</span>}
          </>
        }
      >
        <span data-slot="exercise-name">{name}</span>
      </RowTitle>
      {exercise.mine && <RowEnd>{m.plans_library_yours()}</RowEnd>}
    </>
  );
}

/**
 * Ô tìm và danh sách bài trên catalog trên máy (UC03), chạy được khi offline. Có
 * `onPick` thì mỗi kết quả là nút chọn bài; không có thì chỉ để xem.
 */
export function ExerciseSearch({
  onPick,
  inputRef,
}: {
  onPick?: (exercise: CatalogExercise) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [query, setQuery] = React.useState('');
  const { empty, results } = useExerciseSearch(query);

  let body: React.ReactNode = null;
  if (empty) {
    body = <EmptyState>{m.plans_library_not_downloaded()}</EmptyState>;
  } else if (results && results.length === 0) {
    body = (
      <EmptyState>
        {m.plans_library_no_match({ query: query.trim() })}
      </EmptyState>
    );
  } else if (results) {
    body = (
      <ul aria-label={m.plans_library_results()}>
        {results.map((match) => (
          <li
            key={match.exercise.id}
            className="border-t border-rule-soft first:border-t-0"
          >
            {onPick ? (
              <Row asChild className="border-t-0">
                <button type="button" onClick={() => onPick(match.exercise)}>
                  <ExerciseResult match={match} />
                </button>
              </Row>
            ) : (
              <Row className="border-t-0">
                <ExerciseResult match={match} />
              </Row>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <SearchInput
        ref={inputRef}
        aria-label={m.plans_library_search_label()}
        placeholder={m.plans_library_search_placeholder()}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Block className="mt-3">{body}</Block>
    </>
  );
}

/**
 * Sheet chọn một bài từ catalog trên máy, dùng chung cho thêm bài vào ngày tập, thêm hay
 * thay bài giữa buổi. Chọn xong thì sheet đóng và gọi `onPick`.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  title = m.plans_picker_add_title(),
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onPick: (exercise: CatalogExercise) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        // Cao cố định bằng mức tối đa: sheet không co giãn theo số kết quả khi đang gõ.
        className="h-[88dvh]"
        onOpenAutoFocus={(event) => {
          // Mở sheet là để gõ tìm: focus ô tìm thay vì nút đóng.
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {/* Con của vùng cuộn không được co (`flex-none`): nếu không, danh sách dài ép ô tìm
            thấp lại và khối kết quả bị cắt thay vì cuộn. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 [&>*]:flex-none">
          <ExerciseSearch
            inputRef={inputRef}
            onPick={(exercise) => {
              onOpenChange(false);
              onPick(exercise);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
