import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import ReactECharts from 'echarts-for-react';
import { Activity, Coins, Cpu, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '../../../components/shared';
import {
  PALETTE,
  SERIES_COLORS,
  baseGrid,
  categoryAxis,
  valueAxis,
  tooltipStyle,
  legendStyle,
  withBase,
} from '../../../components/shared/RevenueCharts/revenueChartTheme';
import { getAiUsage, getAiUsageRate, setAiUsageRate } from '../../../services/aiUsage.service';
import type {
  AiUsageResponse,
  AiUsageRange,
  AiUsageBreakdown,
  AiUsageRate,
} from '../../../types/aiUsage.types';
import {
  AI_USAGE_RANGE_DAYS,
  AI_USAGE_RANGE_LABEL,
  AI_FEATURE_LABEL,
} from '../../../types/aiUsage.types';
import { apiErrorMessage } from '../../../utils/apiError';

const RANGES: AiUsageRange[] = ['7d', '30d', '90d'];

/**
 * Số ở Tutora dùng dấu PHẨY phân cách nghìn, dấu CHẤM cho thập phân (26,072.50).
 * Locale 'vi-VN' cho ngược lại ('26.072,5') nên không dùng được.
 */
const groupSeparated = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const formatNumber = (value: number): string => groupSeparated(value);

/** Tỉ giá luôn hiện 2 số lẻ: 26,072.50 */
const formatRate = (value: number): string => groupSeparated(value, 2);

/**
 * Google tính tiền bằng USD nên DB lưu USD; quy đổi sang VND chỉ để hiển thị.
 * Tỉ giá lấy từ BE (API tỉ giá thị trường, hoặc giá trị admin tự nhập).
 *
 * Một lượt giải bài chỉ tốn khoảng trăm đồng — làm tròn về 0 là mất luôn thông
 * tin, nên dưới 1.000đ vẫn giữ số lẻ.
 */
const makeFormatMoney = (rate: number) => (usd: number): string => {
  const vnd = usd * rate;
  if (vnd === 0) return '0 ₫';
  if (vnd < 1) return `${groupSeparated(vnd, 2)} ₫`;
  if (vnd < 1_000) return `${groupSeparated(vnd, 1)} ₫`;
  return `${groupSeparated(vnd)} ₫`;
};

const formatCompact = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
      : String(value);

/** % thay đổi so kỳ trước. null = kỳ trước không có dữ liệu -> không so được. */
const changePercent = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

const featureLabel = (key: string): string => AI_FEATURE_LABEL[key] ?? key;

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  /** Với lỗi thì tăng là XẤU — đảo màu so với mặc định. */
  invertChange?: boolean;
}

const Metric: React.FC<MetricProps> = ({ icon, label, value, hint, change, invertChange }) => {
  const positive = change != null && change > 0;
  const good = invertChange ? !positive : positive;

  return (
    <div className="rounded-lg border border-[rgba(26,34,56,0.10)] bg-white p-4">
      <div className="flex items-center gap-2 text-[rgba(26,34,56,0.60)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#1a2238]">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {change != null && (
          <span className={good ? 'text-emerald-600' : 'text-red-600'}>
            {positive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[rgba(26,34,56,0.55)]">{hint}</span>}
      </div>
    </div>
  );
};

/** Bảng gom nhóm dùng chung cho cả "theo model" lẫn "theo tính năng". */
const BreakdownTable: React.FC<{
  rows: AiUsageBreakdown[];
  headKey: string;
  formatMoney: (usd: number) => string;
  labelOf?: (key: string) => string;
}> = ({ rows, headKey, formatMoney, labelOf }) => {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-[rgba(26,34,56,0.55)]">Chưa có dữ liệu.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-sm">
        <thead>
          <tr className="border-b border-[rgba(26,34,56,0.10)] text-left text-xs uppercase tracking-wide text-[rgba(26,34,56,0.55)]">
            <th className="py-2 pr-3 font-medium whitespace-nowrap">{headKey}</th>
            <th className="py-2 pr-3 text-right font-medium">Lượt gọi</th>
            <th className="py-2 pr-3 text-right font-medium">Token</th>
            <th className="py-2 pr-3 text-right font-medium">Chi phí</th>
            <th className="py-2 pl-3 text-right font-medium">Tỉ trọng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[rgba(26,34,56,0.06)] last:border-0">
              <td className="py-2.5 pr-3">
                <span className="text-[#1a2238]">{labelOf ? labelOf(row.key) : row.key}</span>
                {row.failedCalls > 0 && (
                  <span className="ml-2 text-xs text-red-600">{row.failedCalls} lỗi</span>
                )}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatNumber(row.calls)}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatCompact(row.totalTokens)}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(row.costUsd)}</td>
              <td className="py-2.5 pl-3 text-right tabular-nums text-[rgba(26,34,56,0.65)]">
                {row.costShare.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const UsageTab: React.FC = () => {
  const [range, setRange] = useState<AiUsageRange>('30d');
  const [data, setData] = useState<AiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState<AiUsageRate | null>(null);
  // Giá trị đang gõ, tách khỏi `rate` để chưa Enter thì chưa đổi số liệu hiển thị.
  const [rateDraft, setRateDraft] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  // Chỉ sửa được sau khi bấm "Cập nhật" -> tránh gõ nhầm vào con số đang hiển thị.
  const [editingRate, setEditingRate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getAiUsageRate();
        if (cancelled) return;
        setRate(r);
      } catch {
        // Không lấy được tỉ giá thì vẫn cho xem trang, chỉ là tiền quy đổi bằng
        // tỉ giá dự phòng của BE.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startEditRate = () => {
    // Ô nhập cho số trần (26072.5) để gõ lại cho dễ, dấu phân cách chỉ dùng khi hiển thị.
    setRateDraft(rate ? String(rate.rate) : '');
    setEditingRate(true);
  };

  const cancelEditRate = () => {
    setEditingRate(false);
    setRateDraft('');
  };

  /** Lưu tỉ giá. Bỏ trống = quay lại tỉ giá thị trường. */
  const applyRate = async () => {
    const text = rateDraft.trim();
    const parsed = text === '' ? null : Number(text.replace(/[^\d.]/g, ''));
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error('Tỉ giá phải là số lớn hơn 0.');
      return;
    }

    setSavingRate(true);
    try {
      const saved = await setAiUsageRate(parsed);
      setRate(saved);
      setEditingRate(false);
      setRateDraft('');
      toast.success(parsed === null ? 'Đã dùng lại tỉ giá thị trường.' : 'Đã cập nhật tỉ giá.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không lưu được tỉ giá.'));
    } finally {
      setSavingRate(false);
    }
  };

  useEffect(() => {
    // Đổi khoảng thời gian -> huỷ kết quả của lần gọi cũ để tránh race khi
    // request trước về sau request sau.
    let cancelled = false;

    const load = async () => {
      try {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - AI_USAGE_RANGE_DAYS[range]);
        const result = await getAiUsage(toIsoDate(from), toIsoDate(to));
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) toast.error(apiErrorMessage(err, 'Không tải được số liệu sử dụng AI.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = data?.totals;
  const formatMoney = useMemo(() => makeFormatMoney(rate?.rate ?? 0), [rate]);

  /** Chi phí và lượt gọi lệch nhau nhiều bậc -> mỗi chuỗi một trục Y riêng. */
  const timelineOption = useMemo(() => {
    const points = data?.timeline ?? [];
    return withBase({
      tooltip: { trigger: 'axis', ...tooltipStyle },
      legend: { ...legendStyle, data: ['Chi phí', 'Lượt gọi'] },
      grid: { ...baseGrid, bottom: 24 },
      xAxis: categoryAxis(points.map((p) => p.date.slice(5))),
      yAxis: [
        {
          ...valueAxis(false),
          axisLabel: {
            ...valueAxis(false).axisLabel,
            formatter: (v: number) => formatMoney(v),
          },
        },
        { ...valueAxis(false), splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Chi phí',
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: 0,
          itemStyle: { color: PALETTE.navy },
          areaStyle: { color: 'rgba(26, 34, 56, 0.08)' },
          data: points.map((p) => p.costUsd),
        },
        {
          name: 'Lượt gọi',
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: 1,
          itemStyle: { color: PALETTE.gold },
          data: points.map((p) => p.calls),
        },
      ],
    });
  }, [data, formatMoney]);

  const featureOption = useMemo(() => {
    // Nhiều feature nhỏ sẽ làm donut rối -> gộp phần đuôi thành "Khác".
    const rows = data?.byFeature ?? [];
    const top = rows.slice(0, 7);
    const restCost = rows.slice(7).reduce((sum, r) => sum + r.costUsd, 0);
    const slices = top.map((r) => ({ name: featureLabel(r.key), value: r.costUsd }));
    if (restCost > 0) slices.push({ name: 'Khác', value: restCost });

    return withBase({
      tooltip: {
        trigger: 'item',
        ...tooltipStyle,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>${formatMoney(p.value)} (${p.percent.toFixed(1)}%)`;
        },
      },
      legend: { ...legendStyle, type: 'scroll' },
      color: SERIES_COLORS,
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '44%'],
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: slices,
        },
      ],
    });
  }, [data, formatMoney]);

  const hasData = (totals?.calls ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[rgba(26,34,56,0.10)] bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                range === r
                  ? 'bg-[#1a2238] text-white'
                  : 'text-[rgba(26,34,56,0.65)] hover:bg-[rgba(26,34,56,0.05)]'
              }`}
            >
              {AI_USAGE_RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[rgba(26,34,56,0.60)]">Tỉ giá 1 USD</span>

          {editingRate ? (
            <>
              <input
                autoFocus
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void applyRate();
                  if (e.key === 'Escape') cancelEditRate();
                }}
                disabled={savingRate}
                className="w-32 rounded-md border border-[rgba(26,34,56,0.15)] bg-white px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums outline-none focus:border-[#1a2238] disabled:opacity-60"
              />
              <Button size="sm" onClick={() => void applyRate()} disabled={savingRate}>
                Lưu
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditRate} disabled={savingRate}>
                Huỷ
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold tabular-nums text-[#1a2238]">
                {rate ? `${formatRate(rate.rate)} ₫` : '—'}
              </span>
              <Button size="sm" variant="outline" onClick={startEditRate} disabled={!rate}>
                Cập nhật
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-sm text-[rgba(26,34,56,0.55)]">Đang tải…</div>
      ) : !hasData ? (
        <SectionCard title="Chưa có dữ liệu" padded>
          <div className="py-8 text-center text-sm text-[rgba(26,34,56,0.60)]">
            Chưa ghi nhận lượt gọi AI nào trong khoảng thời gian này.
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Coins size={15} />}
              label="Chi phí"
              value={formatMoney(totals!.costUsd)}
              change={changePercent(totals!.costUsd, totals!.prevCostUsd)}
              hint="so kỳ trước"
            />
            <Metric
              icon={<Activity size={15} />}
              label="Lượt gọi"
              value={formatNumber(totals!.calls)}
              change={changePercent(totals!.calls, totals!.prevCalls)}
              hint="so kỳ trước"
            />
            <Metric
              icon={<Cpu size={15} />}
              label="Token"
              value={formatCompact(totals!.totalTokens)}
              change={changePercent(totals!.totalTokens, totals!.prevTotalTokens)}
              hint={`vào ${formatCompact(totals!.promptTokens)} · ra ${formatCompact(
                totals!.outputTokens + totals!.thoughtsTokens,
              )}`}
            />
            <Metric
              icon={<AlertTriangle size={15} />}
              label="Lời gọi lỗi"
              value={formatNumber(totals!.failedCalls)}
              invertChange
              hint={
                totals!.avgLatencyMs != null ? `trễ TB ${formatNumber(totals!.avgLatencyMs)}ms` : undefined
              }
            />
          </div>

          <SectionCard title="Chi phí & lượt gọi theo ngày" padded>
            <ReactECharts option={timelineOption} style={{ height: 320 }} notMerge />
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Theo tính năng" padded>
              <ReactECharts option={featureOption} style={{ height: 260 }} notMerge />
              <BreakdownTable
                rows={data!.byFeature}
                headKey="Tính năng"
                formatMoney={formatMoney}
                labelOf={featureLabel}
              />
            </SectionCard>

            <SectionCard title="Theo model" padded>
              <BreakdownTable rows={data!.byModel} headKey="Model" formatMoney={formatMoney} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
};
