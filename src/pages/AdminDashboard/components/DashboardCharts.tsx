import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList,
} from 'recharts';
import type {
    FinancialTrendPoint,
    LessonTrendPoint,
} from '../../../types/admin.types';
import { formatCompactNumber, formatNumber, formatCurrency } from '../../../utils/formatters';
import { CHART, axisProps } from './chartTheme';

// ─── Shared bits ───

export const ChartEmpty = ({ loading }: { loading?: boolean }) => (
    <div className="admin-chart-empty">
        <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'bar_chart'}</span>
        <span>{loading ? 'Đang tải dữ liệu…' : 'Chưa có dữ liệu trong kỳ này'}</span>
    </div>
);

interface TooltipEntry {
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
}

const ChartTooltip = ({
    active,
    payload,
    label,
    money,
}: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
    money?: boolean;
}) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="admin-chart-tooltip">
            {label != null && <div className="admin-chart-tooltip-label">{label}</div>}
            {payload.map((p, i) => (
                <div key={p.dataKey ?? i} className="admin-chart-tooltip-row">
                    <span className="admin-chart-tooltip-dot" style={{ background: p.color }} />
                    <span className="admin-chart-tooltip-name">{p.name}</span>
                    <strong>
                        {money
                            ? formatCurrency(Number(p.value))
                            : formatNumber(Number(p.value))}
                    </strong>
                </div>
            ))}
        </div>
    );
};

/** Chú thích (legend) tự dựng — gọn và đồng nhất hơn legend mặc định. */
export const ChartLegend = ({ items }: { items: { label: string; color: string }[] }) => (
    <div className="admin-chart-legend">
        {items.map((it) => (
            <span key={it.label} className="admin-chart-legend-item">
                <span className="admin-chart-legend-dot" style={{ background: it.color }} />
                {it.label}
            </span>
        ))}
    </div>
);

// ─── 1. Xu hướng tài chính (GMV + Doanh thu nền tảng) ───

export const FinancialTrendChart = ({ data }: { data: FinancialTrendPoint[] }) => {
    if (!data || data.length === 0) return <ChartEmpty />;
    return (
        <>
            <ChartLegend
                items={[
                    { label: 'GMV', color: CHART.gold },
                    { label: 'Doanh thu nền tảng', color: CHART.navy },
                ]}
            />
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="grad-gmv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART.gold} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.navy} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={CHART.navy} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                    <YAxis {...axisProps} width={56} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                    <Tooltip content={<ChartTooltip money />} />
                    <Area
                        type="monotone"
                        dataKey="gmv"
                        name="GMV"
                        stroke={CHART.gold}
                        strokeWidth={2.5}
                        fill="url(#grad-gmv)"
                    />
                    <Area
                        type="monotone"
                        dataKey="platformRevenue"
                        name="Doanh thu nền tảng"
                        stroke={CHART.navy}
                        strokeWidth={2.5}
                        fill="url(#grad-rev)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </>
    );
};

// ─── 2. Hoạt động buổi học (cột chồng) ───

export const LessonActivityChart = ({ data }: { data: LessonTrendPoint[] }) => {
    if (!data || data.length === 0) return <ChartEmpty />;
    return (
        <>
            <ChartLegend
                items={[
                    { label: 'Hoàn thành', color: CHART.green },
                    { label: 'Hủy', color: CHART.gold },
                    { label: 'Vắng mặt', color: CHART.burgundy },
                ]}
            />
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} width={36} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(26,34,56,0.04)' }} />
                    <Bar dataKey="completed" name="Hoàn thành" stackId="a" fill={CHART.green} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cancelled" name="Hủy" stackId="a" fill={CHART.gold} />
                    <Bar dataKey="noShow" name="Vắng mặt" stackId="a" fill={CHART.burgundy} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </>
    );
};

// ─── 3. Donut phân loại (người dùng / khiếu nại) ───

export interface DonutDatum {
    name: string;
    value: number;
}

export const CategoryDonut = ({
    data,
    colors,
    centerLabel,
}: {
    data: DonutDatum[];
    colors: string[];
    centerLabel?: string;
}) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <ChartEmpty />;
    return (
        <div className="admin-donut-wrap">
            <div className="admin-donut-canvas">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={2}
                            stroke="none"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={colors[i % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="admin-donut-center">
                    <div className="admin-donut-center-value">{formatNumber(total)}</div>
                    {centerLabel && <div className="admin-donut-center-label">{centerLabel}</div>}
                </div>
            </div>
            <div className="admin-donut-legend">
                {data.map((d, i) => (
                    <div key={d.name} className="admin-donut-legend-row">
                        <span className="admin-chart-legend-dot" style={{ background: colors[i % colors.length] }} />
                        <span className="admin-donut-legend-name">{d.name}</span>
                        <strong>{formatNumber(d.value)}</strong>
                        <span className="admin-donut-legend-pct">
                            {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── 4. Cột ngang (phễu gia sư / top doanh thu / loại khiếu nại) ───

export interface BarDatum {
    name: string;
    value: number;
}

export const HorizontalBars = ({
    data,
    color,
    colors,
    money,
}: {
    data: BarDatum[];
    color?: string;
    colors?: string[];
    money?: boolean;
}) => {
    if (!data || data.length === 0) return <ChartEmpty />;
    const height = Math.max(120, data.length * 42 + 16);
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" hide tickFormatter={(v) => formatCompactNumber(Number(v))} />
                <YAxis
                    type="category"
                    dataKey="name"
                    {...axisProps}
                    width={132}
                    tick={{ fill: CHART.navy, fontSize: 12 }}
                />
                <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: 'rgba(26,34,56,0.04)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.map((_, i) => (
                        <Cell key={i} fill={colors ? colors[i % colors.length] : color || CHART.gold} />
                    ))}
                    <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v: unknown) => (money ? formatCompactNumber(Number(v)) : formatNumber(Number(v)))}
                        style={{ fill: CHART.navy, fontSize: 12, fontWeight: 600 }}
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};
