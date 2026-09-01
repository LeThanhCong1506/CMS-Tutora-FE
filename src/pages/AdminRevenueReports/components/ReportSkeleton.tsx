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

/** Cột cao thấp xen kẽ để gợi hình dáng biểu đồ, không phải khối đặc. */
const ChartBones: React.FC<{ height: number }> = ({ height }) => (
    <div className="rev-sk-chart" style={{ height }}>
        {[52, 78, 44, 90, 66, 82, 58].map((pct, i) => (
            <span key={i} className="rev-sk-col" style={{ height: `${pct}%` }} />
        ))}
    </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 240 }) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text" style={{ flex: 1 }}>
                <Bar w="42%" h={15} />
                <span style={{ display: 'block', height: 6 }} />
                <Bar w="62%" h={11} />
            </div>
        </header>
        <div className="rev-block-body">
            <ChartBones height={height} />
        </div>
    </section>
);

/**
 * Khối biểu đồ gộp: một biểu đồ chính rồi hai biểu đồ phụ ngăn bằng kẻ dọc — khớp
 * `ChartBlock` khi có prop `split`.
 *
 * Bản cũ (`SkeletonChartPair`) dựng hai thẻ rời trong `.rev-grid-2`, tức đúng bố cục mà
 * trang thật vừa bỏ. Khung xương lệch bố cục thì lúc dữ liệu về trang nhảy đúng bằng phần
 * chiều cao vừa tiết kiệm được — người dùng thấy giật hơn chứ không gọn hơn.
 */
export const SkeletonChartSplit: React.FC<{
    height?: number;
    subHeight?: number;
    /** Số biểu đồ phụ — phải khớp độ dài mảng `split` của khối thật, nếu không trang giật. */
    cells?: number;
}> = ({ height = 240, subHeight = 220, cells = 2 }) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text" style={{ flex: 1 }}>
                <Bar w="42%" h={15} />
                <span style={{ display: 'block', height: 6 }} />
                <Bar w="62%" h={11} />
            </div>
        </header>
        <div className="rev-block-body">
            <ChartBones height={height} />
        </div>
        <div className="rev-split">
            {Array.from({ length: cells }).map((_, i) => (
                <div className="rev-split-cell" key={i}>
                    <span style={{ display: 'block', paddingLeft: 8 }}>
                        <Bar w="46%" h={12} />
                    </span>
                    <span style={{ display: 'block', height: 6 }} />
                    <ChartBones height={subHeight} />
                </div>
            ))}
        </div>
    </section>
);

/** Cột trái thẻ phân bổ: hai hàng, mỗi hàng một thanh kèm dòng chú thích ngay dưới. */
const AllocBones = () => (
    <div className="rev-alloc">
        <div className="rev-alloc-main">
            <Bar w="38%" h={15} />
            {[0, 1].map((i) => (
                <div key={i} style={{ marginTop: 12 }}>
                    <Bar h={18} radius={6} />
                    <span style={{ display: 'block', height: 5 }} />
                    <Bar w="64%" h={14} />
                </div>
            ))}
        </div>
        <div className="rev-alloc-aside">
            <Bar w="52%" h={15} />
            <span style={{ display: 'block', height: 14 }} />
            <span
                className="rev-sk-bar"
                style={{ display: 'block', width: 106, height: 106, borderRadius: '50%', margin: '0 auto' }}
            />
        </div>
    </div>
);

/** Dải chỉ số và khối phân bổ trong CÙNG một khung — khớp `.rev-hero` của tab Doanh thu. */
export const SkeletonHero: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <section className="rev-hero">
        <SkeletonStrip count={count} />
        <AllocBones />
    </section>
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
    /** Dải chỉ số và khối phân bổ chung một khung — riêng tab Doanh thu. */
    hero?: boolean;
    /** Số khối biểu đồ gộp (một chính + N phụ ngăn bằng kẻ dọc). */
    splits?: number;
    /** Số ô phụ trong mỗi khối gộp. */
    splitCells?: number;
}> = ({
    metrics = 4,
    charts = 2,
    table = true,
    strip = false,
    hero = false,
    splits = 0,
    splitCells = 2,
}) => (
    <div className="rev-stack" aria-busy="true" aria-live="polite">
        <span className="rev-sk-sr">Đang tải số liệu…</span>
        {hero ? (
            <SkeletonHero count={metrics} />
        ) : strip ? (
            <SkeletonStrip count={metrics} />
        ) : (
            <SkeletonMetrics count={metrics} />
        )}
        {Array.from({ length: charts }).map((_, i) => (
            <SkeletonChart key={i} />
        ))}
        {Array.from({ length: splits }).map((_, i) => (
            <SkeletonChartSplit key={`split-${i}`} cells={splitCells} />
        ))}
        {table && <SkeletonTable />}
    </div>
);

export default ReportSkeleton;
