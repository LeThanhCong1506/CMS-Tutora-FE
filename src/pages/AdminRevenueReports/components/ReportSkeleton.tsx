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

/* `SkeletonMetrics` (lưới `.rev-metric-grid`, mỗi chỉ số một thẻ rời) đã gỡ 01/09/2026:
   cả 5 tab báo cáo doanh thu nay dùng chung `.rev-strip`, nên nhánh đó không còn đường chạy
   tới. Bỏ luôn prop `strip` để khuôn thành BẮT BUỘC — tab thứ 6 sau này không vô tình quay
   lại lưới cũ được. */

/** Dải chỉ số dùng chung cả 5 tab — một thẻ, các ô ngăn bằng đường kẻ mảnh. */
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

/**
 * Thẻ phân bổ: tiêu đề rồi BA CỘT của phương trình
 * (tiền khách trả = gia sư nhận + doanh thu tạm tính).
 *
 * Xương phải bám đúng layout thật, lệch là trang giật một nhịp khi dữ liệu về — nên ở đây
 * cũng là grid ba cột, cột thứ ba cao hơn vì có thêm hai dòng con. Khối này từng là bảng 6
 * hàng, trước nữa là hai thanh dài, trước nữa nữa có cả cột phải với vòng tròn giả vành
 * khuyên; lý do bỏ từng bản ghi ở đầu MoneySplit.tsx.
 */
const AllocBones = () => (
    <div className="rev-alloc">
        <div className="rev-alloc-main">
            <Bar w="38%" h={15} />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1.35fr',
                    gap: 24,
                    marginTop: 16,
                }}
            >
                {[0, 1, 2].map((i) => (
                    <div key={i}>
                        <Bar w="52%" h={11} />
                        <span style={{ display: 'block', height: 7 }} />
                        <Bar w="78%" h={20} />
                        {/* Chỉ cột thứ ba có hai dòng con — giống hệt bản thật. */}
                        {i === 2 && (
                            <>
                                <span style={{ display: 'block', height: 14 }} />
                                <Bar w="64%" h={12} />
                                <span style={{ display: 'block', height: 6 }} />
                                <Bar w="68%" h={12} />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* `SkeletonHero` đã gỡ 01/09/2026: nó bọc dải chỉ số + khối phân bổ trong cùng khung
   `.rev-hero`. Hai khối giờ không còn kề nhau (khối phân bổ nằm SAU biểu đồ), nên xương
   cũng phải tách ra — xem prop `alloc` bên dưới. */

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
    /**
     * Xương của thẻ "Phân bổ tiền khách trả" — riêng tab Doanh thu. Đặt SAU các khối
     * biểu đồ, đúng thứ tự thật của trang; xương lệch thứ tự thì trang nhảy khi dữ liệu về.
     */
    alloc?: boolean;
    /** Số khối biểu đồ gộp (một chính + N phụ ngăn bằng kẻ dọc). */
    splits?: number;
    /** Số ô phụ trong mỗi khối gộp. */
    splitCells?: number;
}> = ({
    metrics = 4,
    charts = 2,
    table = true,
    alloc = false,
    splits = 0,
    splitCells = 2,
}) => (
    <div className="rev-stack" aria-busy="true" aria-live="polite">
        <span className="rev-sk-sr">Đang tải số liệu…</span>
        {/* `metrics={0}` = tab không có dải chỉ số (tab Môn & Lớp, từ 02/09/2026). Phải bỏ hẳn
            phần tử chứ không render `.rev-strip` rỗng — nó có viền và nền trắng riêng nên sẽ ra
            một thanh trắng trống trơn, rồi biến mất khi dữ liệu về: đúng kiểu giật mà khung
            xương sinh ra để tránh. */}
        {metrics > 0 && <SkeletonStrip count={metrics} />}
        {Array.from({ length: charts }).map((_, i) => (
            <SkeletonChart key={i} />
        ))}
        {Array.from({ length: splits }).map((_, i) => (
            <SkeletonChartSplit key={`split-${i}`} cells={splitCells} />
        ))}
        {alloc && <AllocBones />}
        {table && <SkeletonTable />}
    </div>
);

export default ReportSkeleton;
