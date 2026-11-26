import * as React from 'react';

import { m } from '@/paraglide/messages.js';
import { cn } from '@/lib/utils';

export interface ChartPoint {
  /** Nhãn trục ngang và cột đầu của bảng, vd "Nov 16". */
  x: string;
  y: number;
  /** Giá trị đã định dạng cho nhãn, hộp rê và bảng, vd "104.5 kg". */
  label: string;
  /** Nhãn ngắn trên cột hiện tại (biểu đồ cột), vd "3". */
  short?: string;
}

/**
 * Biểu đồ SVG nhỏ (prototypes/shared/chart.js, DESIGN.md › Charts): một chuỗi mực, đúng
 * một điểm cam (điểm cuối) luôn có nhãn giá trị; chạm hoặc rê hiện đường dóng và hộp giá
 * trị; nút "Show as table" chuyển sang bảng.
 */
export function Chart({
  points,
  tablePoints = points,
  kind,
  title,
  xHead,
  yHead,
  yFormat,
  zero,
  height = 180,
  empty,
}: {
  points: ChartPoint[];
  /** Điểm cho dạng bảng khi cần nhãn dài hơn trục (vd tháng kèm năm); mặc định `points`. */
  tablePoints?: ChartPoint[];
  kind: 'line' | 'bar';
  /** Tên biểu đồ cho trình đọc màn hình và chú thích bảng. */
  title: string;
  xHead: string;
  yHead: string;
  /** Định dạng nhãn vạch trục đứng. */
  yFormat: (value: number) => string;
  /** Trục đứng bắt đầu từ 0 (biểu đồ cột). */
  zero?: boolean;
  height?: number;
  /** Câu hiện khi không có điểm nào. */
  empty: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const [table, setTable] = React.useState(false);

  if (points.length === 0) {
    return (
      <div className="px-4 py-7 text-center">
        <p>{empty}</p>
      </div>
    );
  }

  const W = 360;
  const H = height;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const ys = points.map((p) => p.y);
  let lo = zero ? 0 : Math.min(...ys);
  let hi = Math.max(...ys);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const stepRaw = (hi - lo) / 3;
  const mag = 10 ** Math.floor(Math.log10(stepRaw));
  const step =
    [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= stepRaw) ??
    10 * mag;
  lo = zero ? 0 : Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);

  const n = points.length;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const X = (i: number) =>
    kind === 'bar'
      ? padL + (iw * (i + 0.5)) / n
      : padL + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const Y = (v: number) => padT + ih * (1 - (v - lo) / (hi - lo));
  const last = n - 1;
  const hp = points[last];
  const xTicks = [...new Set([0, Math.floor(last / 2), last])];

  let marks: React.ReactNode;
  if (kind === 'bar') {
    const bw = Math.min(24, iw / n - 2);
    marks = points.map((p, i) => {
      const x = X(i) - bw / 2;
      const y = Y(p.y);
      const h = Math.max(0, Y(lo) - y);
      const r = Math.min(4, h);
      if (h <= 0) return null;
      return (
        <path
          key={i}
          d={`M${x},${Y(lo)}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${Y(lo)}Z`}
          className={i === last ? 'fill-orange' : 'fill-ink'}
        />
      );
    });
  } else {
    const d = points
      .map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`)
      .join('');
    marks = (
      <>
        <path
          d={d}
          className="fill-none stroke-ink stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
        />
        <circle
          cx={X(last)}
          cy={Y(hp.y)}
          r={5}
          className="fill-orange stroke-tyvek stroke-2"
        />
      </>
    );
  }
  const labelY = Math.max(11, Y(hp.y) - 9);
  const valueLabel = (
    <text
      x={kind === 'bar' ? X(last) : Math.min(W - padR, Math.max(padL, X(last)))}
      y={labelY}
      textAnchor={kind === 'bar' ? 'middle' : 'end'}
      className="fill-ink font-numeral text-[16px] font-extrabold"
    >
      {kind === 'bar' ? (hp.short ?? hp.label) : hp.label}
    </text>
  );
  const axis =
    'fill-ink text-label font-semibold [font-variant-numeric:tabular-nums]';
  const anchorFor = (i: number) =>
    kind === 'bar'
      ? 'middle'
      : i === 0
        ? 'start'
        : i === last
          ? 'end'
          : 'middle';
  // Số điểm có thể đổi (vd tuần → tháng) khi đang rê: điểm cũ không còn thì bỏ.
  const tip = active === null ? undefined : points[active];
  const tipPct = active === null ? 0 : (X(active) / W) * 100;

  return (
    <figure className="relative m-0 px-2 pt-2 pb-1" aria-label={title}>
      {table ? (
        <table className="w-full border-collapse [font-variant-numeric:tabular-nums]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th className="border-b-[1.5px] border-ink px-2 py-1.5 text-left label-caps">
                {xHead}
              </th>
              <th className="border-b-[1.5px] border-ink px-2 py-1.5 text-right label-caps">
                {yHead}
              </th>
            </tr>
          </thead>
          <tbody>
            {tablePoints.map((p, i) => (
              <tr key={i}>
                <td className="border-b border-rule-soft p-2">{p.x}</td>
                <td className="border-b border-rule-soft p-2 text-right">
                  {p.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={m.chart_summary({ title, latest: hp.label })}
            className="block h-auto w-full touch-pan-y overflow-visible"
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={Y(v)}
                  y2={Y(v)}
                  className="stroke-rule-soft"
                />
                <text
                  x={padL - 6}
                  y={Y(v) + 4}
                  textAnchor="end"
                  className={axis}
                >
                  {yFormat(v)}
                </text>
              </g>
            ))}
            {marks}
            {valueLabel}
            {xTicks.map((i) => (
              <text
                key={i}
                x={X(i)}
                y={H - 8}
                textAnchor={anchorFor(i)}
                className={axis}
              >
                {points[i].x}
              </text>
            ))}
            {tip && active !== null && (
              <line
                x1={X(active)}
                x2={X(active)}
                y1={padT}
                y2={padT + ih}
                className="stroke-ink opacity-35"
              />
            )}
            {points.map((_, i) => (
              <rect
                key={i}
                x={X(i) - iw / n / 2}
                y={padT}
                width={iw / n}
                height={ih}
                className="cursor-crosshair fill-transparent"
                onPointerMove={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            ))}
          </svg>
          {tip && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-[2] rounded-sm bg-ink px-2.5 py-1.5 text-label leading-[1.35] font-semibold whitespace-nowrap text-tyvek"
              style={{
                left: `${tipPct}%`,
                transform: `translateX(-${tipPct}%)`,
              }}
            >
              <b className="font-numeral text-[16px] font-extrabold">
                {tip.label}
              </b>{' '}
              {tip.x}
            </div>
          )}
        </>
      )}
      <button
        type="button"
        aria-pressed={table}
        onClick={() => setTable((t) => !t)}
        className={cn(
          'ml-auto block min-h-9 px-2 text-label font-bold underline underline-offset-3',
        )}
      >
        {table ? m.chart_show_chart() : m.chart_show_table()}
      </button>
    </figure>
  );
}
