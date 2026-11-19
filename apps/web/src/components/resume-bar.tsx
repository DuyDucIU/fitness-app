import { Link } from 'react-router';

import { m } from '@/paraglide/messages.js';

/**
 * Thanh tiếp tục buổi tập (prototypes/shared/base.css › .resume, kit.js › resumeBar):
 * dải cam giữa thanh trên và vùng cuộn của các màn gốc khi có buổi đang dở.
 * Đặt vào slot `banner` của `AppShell`.
 */
export function ResumeBar({
  to,
  name,
  elapsed,
  setsLogged,
}: {
  /** Đường dẫn tới màn ghi buổi tập. */
  to: string;
  name: string;
  /** Thời gian đã tập, đã định dạng (vd "31:12"). */
  elapsed: string;
  setsLogged: number;
}) {
  return (
    <Link
      to={to}
      aria-label={m.resume_label({ name, elapsed })}
      className="mx-3 mb-2 flex min-h-14 flex-none items-center gap-2.5 rounded-md bg-orange py-1.5 pr-2 pl-4 text-ink no-underline"
    >
      <span className="min-w-0 flex-1 label-caps">
        {m.resume_in_progress({ name })}
        <span className="block font-sans font-semibold tracking-normal normal-case">
          {m.resume_sets_logged({ count: setsLogged })}
        </span>
      </span>
      <b className="text-num leading-none numeral">{elapsed}</b>
      <span className="inline-flex min-h-10 flex-none items-center justify-center rounded-sm bg-ink px-4 font-bold whitespace-nowrap text-tyvek">
        {m.resume_action()}
      </span>
    </Link>
  );
}
