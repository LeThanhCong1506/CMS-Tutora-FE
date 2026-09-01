import React from 'react';

const Bar: React.FC<{ w?: string; h?: number; radius?: number }> = ({
    w = '100%',
    h = 12,
    radius = 6,
}) => <span className="rev-sk-bar" style={{ width: w, height: h, borderRadius: radius }} />;

/** Khung xương một thẻ chỉ số — icon trái, số/nhãn/chú thích phải, khớp `MetricCard`. */
const MetricBones = () => (
    <div className="rev-metric">
        <Bar w="36px" h={36} radius={10} />
        <div className="rev-metric-body">
            <Bar w="72%" h={20} />
            <span style={{ display: 'block', height: 6 }} />
            <Bar w="48%" h={12} />
            <span style={{ display: 'block', height: 5 }} />
            <Bar w="62%" h={10} />
        </div>
    </div>
);

export const SkeletonMetrics: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="rev-metric-grid">
        {Array.from({ length: count }).map((_, i) => (
            <MetricBones key={i} />
        ))}
    </div>
);

/** Dải chỉ số của tab Doanh thu — một thẻ, ba ô ngăn bằng đường kẻ. */
export const SkeletonStrip: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="rev-strip">
        {Array.from({ length: count }).map((_, i) => (
            <MetricBones key={i} />
        ))}
    </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 290 }) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text" style={{ flex: 1 }}>
                <Bar w="42%" h={15} />
                <span style={{ display: 'block', height: 6 }} />
                <Bar w="62%" h={11} />
            </div>
        </header>
        <div className="rev-block-body">
            <div className="rev-sk-chart" style={{ height }}>
                {/* Cột cao thấp xen kẽ để gợi hình dáng biểu đồ, không phải khối đặc */}
                {[52, 78, 44, 90, 66, 82, 58].map((pct, i) => (
                    <span key={i} className="rev-sk-col" style={{ height: `${pct}%` }} />
                ))}
            </div>
        </div>
    </section>
);

export const SkeletonChartPair: React.FC = () => (
    <div className="rev-grid-2">
        <SkeletonChart height={250} />
        <SkeletonChart height={250} />
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 6,
    cols = 6,
}) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text" style={{ flex: 1 }}>
                <Bar w="30%" h={15} />
                <span style={{ display: 'block', height: 6 }} />
                <Bar w="48%" h={11} />
            </div>
        </header>
        <div className="rev-sk-table">
            {Array.from({ length: rows + 1 }).map((_, r) => (
                <div key={r} className="rev-sk-trow">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Bar key={c} w={c === 0 ? '85%' : '58%'} h={r === 0 ? 10 : 12} />
                    ))}
                </div>
            ))}
        </div>
    </section>
);

const ReportSkeleton: React.FC<{
    metrics?: number;
    charts?: number;
    table?: boolean;
    /** Tab Doanh thu mở đầu bằng dải chỉ số liền khối, không phải lưới thẻ rời. */
    strip?: boolean;
}> = ({ metrics = 4, charts = 2, table = true, strip = false }) => (
    <div className="rev-stack" aria-busy="true" aria-live="polite">
        <span className="rev-sk-sr">Đang tải số liệu…</span>
        {strip ? <SkeletonStrip count={metrics} /> : <SkeletonMetrics count={metrics} />}
        {Array.from({ length: charts }).map((_, i) => (
            <SkeletonChart key={i} />
        ))}
        {table && <SkeletonTable />}
    </div>
);

export default ReportSkeleton;
