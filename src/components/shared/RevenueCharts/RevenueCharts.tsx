import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
    CHART_FONT,
    PALETTE,
    SERIES_COLORS,
    axisLabelStyle,
    baseGrid,
    categoryAxis,
    axisMoney,
    fullVnd,
    legendStyle,
    plainNumber,
    tooltipStyle,
    valueAxis,
    withBase,
} from './revenueChartTheme';

interface BaseProps {
    height?: number;
}

const Chart: React.FC<{ option: EChartsOption; height: number }> = ({ option, height }) => (
    <ReactECharts
        option={withBase(option)}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge
    />
);

const fmt = (money: boolean) => (v: number) => (money ? fullVnd(v) : plainNumber(v));

export type ChartRow = object;

/** Đọc một cột theo key động từ ChartRow. */
const cell = (row: ChartRow, key: string): unknown => (row as Record<string, unknown>)[key];

// Đường nhiều chuỗi
export interface LineSeries {
    key: string;
    name: string;
    color?: string;
    /** Nét đứt — dùng cho chuỗi tham chiếu */
    dashed?: boolean;
    /** Tô nền dưới đường */
    area?: boolean;
}

/** Chuỗi vẽ bằng cột, dùng chung trục với các đường. */
export interface BarSeries {
    key: string;
    name: string;
    color?: string;
}

/**
 * Một đoạn của nhãn vạch mốc, tô màu riêng được. Không `color` thì đoạn đó dùng màu mực
 * chung của nhãn.
 *
 * Chia nhãn ra nhiều đoạn CHỈ để gắn màu định danh cho vài chữ bên trong nó — ca có thật là
 * mức phí sàn "5% + 5%", hai vế của hai người khác nhau, và cùng cặp màu ấy đang dùng ở thẻ
 * "Doanh thu tạm tính" ngay dưới biểu đồ. Đừng dùng nó để nhồi thêm chữ vào nhãn: nhãn nằm
 * đè lên vùng vẽ nên mọi ký tự thêm vào đều lấn vào dữ liệu.
 */
export interface ChartMarkerSegment {
    text: string;
    color?: string;
}

/**
 * Vạch dọc đánh dấu một SỰ KIỆN trên trục thời gian — không phải một chuỗi dữ liệu.
 *
 * Sinh ra 03/09/2026 cho vạch "admin đổi mức phí sàn": người xem cần thấy mốc đổi chính sách
 * nằm ở đâu so với hai đường doanh thu, vì phí chốt lúc đặt lịch nên lịch hai bên vạch mang hai
 * mức khác nhau — nhìn riêng con số tổng thì không cách nào kể lại chuyện đó.
 *
 * `x` phải là ĐÚNG một giá trị đang có trên trục hoành. ECharts bỏ qua lặng lẽ vạch trỏ vào
 * category không tồn tại, nên nơi gọi phải tự dò nhãn từ dữ liệu chứ đừng tự dựng chuỗi nhãn.
 */
export interface ChartMarker {
    x: string;
    /**
     * Chữ in cạnh vạch. Giữ ngắn — nó nằm đè lên vùng vẽ.
     *
     * Truyền mảng đoạn khi cần tô màu một phần. Các đoạn nối LIỀN nhau, không tự thêm dấu
     * cách hay dấu phân cách nào: dấu nối phải là một đoạn không màu do nơi gọi tự đặt, vì
     * chỉ nơi gọi biết câu đang viết là gì.
     */
    label: string | ChartMarkerSegment[];
}

export const LineTrendChart: React.FC<
    BaseProps & {
        data: ChartRow[];
        xKey: string;
        series: LineSeries[];
        /**
         * Cột vẽ CHUNG một trục Y với các đường — chỉ truyền khi cùng đơn vị.
         *
         * Cố tình KHÔNG mở trục Y thứ hai như `ComboChart`. Hai trục cho phép nhồi hai đại
         * lượng khác đơn vị vào một khung, nhưng lúc đó chiều cao cột và chiều cao đường
         * không còn so được với nhau — người đọc vẫn cứ so, và đọc ra kết luận sai. Cụm
         * trang này đã phải bỏ hẳn một biểu đồ vì đúng lỗi đó.
         *
         * Cột khai báo trước đường nên nằm dưới, đường luôn nổi lên trên.
         */
        bars?: BarSeries[];
        money?: boolean;
        /** Vạch dọc đánh dấu sự kiện đổi chính sách — xem `ChartMarker`. */
        markers?: ChartMarker[];
    }
> = ({ data, xKey, series, bars = [], markers = [], money = true, height = 300 }) => {
    const categories = data.map((d) => String(cell(d, xKey)));

    /**
     * Vạch mốc nằm sát mép phải thì phải chừa thêm lề, nếu không nhãn bị CẮT CỤT.
     *
     * Nhãn của `markLine` căn giữa trên đầu vạch, nên một nửa bề ngang của nó tràn ra ngoài
     * vùng vẽ. Ở giữa biểu đồ thì không sao, còn ở ô cuối cùng thì nửa ấy rơi ra ngoài khung
     * SVG và bị xén — đo thật: "Phí sàn → 10% + 10%" hiện thành "Phí sàn → 10% + 1".
     *
     * Và đây KHÔNG phải ca hiếm: mốc đổi phí gần nhất thường rơi vào cuối kỳ đang xem.
     *
     * 80px là nửa bề ngang của nhãn dài nhất mà chỗ gọi đang dùng, làm tròn lên. Chỉ nới khi
     * thật sự có vạch ở vùng cuối để mọi biểu đồ khác không mất bề ngang vô cớ.
     *
     * `position: 'insideEndTop'` từng được thử để tránh hẳn chuyện này: ECharts xoay nhãn dọc
     * 90° nên đọc không ra. Đừng đổi sang nó.
     */
    const nearRightEdge = categories.length > 0 && markers.some((m) => {
        const i = categories.indexOf(m.x);
        return i >= 0 && i >= categories.length - Math.max(2, Math.ceil(categories.length * 0.12));
    });

    /* ─── Nhãn vạch mốc tô nhiều màu ────────────────────────────────────────────────
     *
     * ECharts tô một phần nhãn bằng RICH TEXT: chuỗi mang thẻ `{cN|chữ}`, cộng một bảng
     * `rich` khai style cho từng tên `cN`. Tên style chỉ được gồm chữ–số–gạch dưới, nên
     * không nhét mã màu vào tên được — phải gom màu lại rồi trỏ theo CHỈ SỐ.
     *
     * Bảng `rich` là của CẢ markLine chứ không của từng vạch, nên nó phải gom màu của mọi
     * vạch: hai vạch cùng màu thì dùng chung một style, không sinh trùng.
     *
     * Chuỗi rich được nướng sẵn vào `name` của từng mốc thay vì dựng trong `formatter`:
     * tham số của formatter chỉ chắc chắn mang `name`, còn các trường khác của data item
     * thì không có bảo đảm nào giữa các bản ECharts. `name` cũng không lộ ra đâu khác —
     * chuỗi này im lặng ở cả chú giải (liệt kê tường minh) và tooltip (`silent: true`).
     */
    const markerColors = [...new Set(
        markers
            .flatMap((m) => (typeof m.label === 'string' ? [] : m.label))
            .map((seg) => seg.color)
            .filter((c): c is string => Boolean(c)),
    )];

    const markerLabel = (label: ChartMarker['label']): string => (
        typeof label === 'string'
            ? label
            : label
                .map((seg) => (seg.color
                    ? `{c${markerColors.indexOf(seg.color)}|${seg.text}}`
                    : seg.text))
                .join('')
    );

    return (
    <Chart
        height={height}
        option={{
            tooltip: {
                trigger: 'axis',
                ...tooltipStyle,
                valueFormatter: (v) => fmt(money)(Number(v)),
            },
            legend: {
                // Liệt kê TƯỜNG MINH nên chuỗi kỹ thuật mang `markLine` bên dưới tự đứng ngoài
                // chú giải — vạch mốc là chú thích, không phải một chuỗi để bật/tắt.
                ...legendStyle,
                data: [...bars.map((b) => b.name), ...series.map((s) => s.name)],
            },
            // Có vạch mốc thì phải nới đỉnh: nhãn của nó neo trên đầu vạch, mà `baseGrid.top`
            // chỉ chừa 10px vừa đủ cho nửa dòng nhãn trục y trên cùng.
            grid: {
                ...baseGrid,
                top: markers.length ? 34 : baseGrid.top,
                right: nearRightEdge ? 80 : baseGrid.right,
                bottom: 26,
            },
            xAxis: categoryAxis(categories),
            yAxis: valueAxis(money),
            series: [
                ...bars.map((b, i) => ({
                    name: b.name,
                    type: 'bar' as const,
                    barMaxWidth: 18,
                    itemStyle: {
                        color: b.color ?? SERIES_COLORS[i % SERIES_COLORS.length],
                        borderRadius: [3, 3, 0, 0] as [number, number, number, number],
                        opacity: 0.85,
                    },
                    data: data.map((d) => Number(cell(d, b.key) ?? 0)),
                })),
                ...series.map((s, i) => {
                    const color = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
                    return {
                        name: s.name,
                        type: 'line' as const,
                        smooth: true,
                        showSymbol: false,
                        data: data.map((d) => Number(cell(d, s.key) ?? 0)),
                        lineStyle: {
                            width: 2.2,
                            color,
                            type: s.dashed ? ('dashed' as const) : ('solid' as const),
                        },
                        itemStyle: { color },
                        areaStyle: s.area ? { opacity: 0.12, color } : undefined,
                    };
                }),
                /* Vạch mốc treo trên một chuỗi RỖNG riêng, không gắn vào chuỗi dữ liệu nào.
                   Gắn nhờ vào chuỗi đầu tiên thì vạch biến mất khi người dùng tắt chuỗi đó ở
                   chú giải — một chú thích về chính sách không được phụ thuộc vào việc đang bật
                   đường nào.

                   Màu mực trung tính, cố ý KHÔNG lấy màu nào trong bảng chuỗi: nó là chú thích
                   chứ không phải dữ liệu, và ba màu còn lại (emerald / blue / amber) đều đã mang
                   nghĩa riêng trong khung này. */
                ...(markers.length
                    ? [{
                        name: '__markers',
                        type: 'line' as const,
                        data: [],
                        silent: true,
                        markLine: {
                            symbol: 'none' as const,
                            silent: true,
                            lineStyle: {
                                color: 'rgba(26, 34, 56, 0.55)',
                                type: 'dashed' as const,
                                width: 1.5,
                            },
                            label: {
                                position: 'end' as const,
                                distance: 6,
                                color: PALETTE.ink,
                                fontFamily: CHART_FONT,
                                fontSize: 11,
                                fontWeight: 600 as const,
                                backgroundColor: '#fff',
                                borderColor: 'rgba(26, 34, 56, 0.18)',
                                borderWidth: 1,
                                borderRadius: 4,
                                padding: [3, 6] as [number, number],
                                formatter: (p: { name?: string }) => p.name ?? '',
                                /* Chỉ ĐỔI MÀU, ba thuộc tính font lặp y hệt nhãn cha: đoạn
                                   rich không chắc chắn kế thừa font, mà một chữ lệch cỡ hay
                                   lệch nét ngay giữa nhãn thì đọc ra là lỗi hiển thị. Nền và
                                   viền thì KHÔNG lặp — chúng là của cả viên nhãn, đặt lại
                                   trong đoạn rich sẽ vẽ thêm hộp con lồng bên trong. */
                                rich: Object.fromEntries(markerColors.map((color, i) => [
                                    `c${i}`,
                                    {
                                        color,
                                        fontFamily: CHART_FONT,
                                        fontSize: 11,
                                        fontWeight: 600 as const,
                                    },
                                ])),
                            },
                            data: markers.map((m) => ({
                                xAxis: m.x,
                                name: markerLabel(m.label),
                            })),
                        },
                    }]
                    : []),
            ],
        }}
    />
    );
};

// Bar ngang xếp hạng
export const RankBarChart: React.FC<
    BaseProps & {
        data: ChartRow[];
        labelKey: string;
        valueKey: string;
        name: string;
        color?: string;
        money?: boolean;
        /** % thay vì tiền/số trần */
        percent?: boolean;
        /**
         * Bề ngang chừa cho nhãn trục, px. Nới lên khi nhãn có mang chuỗi phân biệt người
         * trùng tên (`chartPersonLabel`) — mặc định 150 cắt cụt đúng phần vừa nối thêm.
         * Nới nhiều thì cột ngắn lại, nên chỉ nới ở biểu đồ thật sự cần.
         */
        labelWidth?: number;
    }
> = ({
    data, labelKey, valueKey, name, color = PALETTE.navy, money = true, percent,
    height = 340, labelWidth = 150,
}) => {
    // ECharts vẽ trục y từ dưới lên — đảo mảng để hạng cao nằm trên cùng.
    const rows = [...data].reverse();
    const format = percent
        ? (v: number) => `${v}%`
        : fmt(money);

    return (
        <Chart
            height={height}
            option={{
                tooltip: {
                    trigger: 'item',
                    ...tooltipStyle,
                    formatter: (p: unknown) => {
                        const item = p as { name: string; value: number };
                        return `${item.name}<br/><strong>${format(item.value)}</strong>`;
                    },
                },
                // Nhãn tiền cuối cột hiện đầy đủ nên cần chừa nhiều chỗ bên phải.
                grid: { ...baseGrid, left: 8, right: percent ? 54 : 96, top: 12, bottom: 8 },
                xAxis: { ...valueAxis(money && !percent), show: false },
                yAxis: {
                    type: 'category',
                    data: rows.map((d) => String(cell(d, labelKey))),
                    axisLabel: { ...axisLabelStyle, width: labelWidth, overflow: 'truncate' },
                    axisTick: { show: false },
                    axisLine: { show: false },
                },
                series: [
                    {
                        name,
                        type: 'bar',
                        barMaxWidth: 16,
                        itemStyle: { color, borderRadius: [0, 5, 5, 0] },
                        data: rows.map((d) => Number(cell(d, valueKey) ?? 0)),
                        label: {
                            show: true,
                            position: 'right',
                            formatter: (p: unknown) => {
                                const v = Number((p as { value: number }).value);
                                return percent ? `${v}%` : money ? axisMoney(v) : plainNumber(v);
                            },
                            // Con số cuối cột là thông tin chính của chart xếp
                            // hạng — dùng mực đậm nhất, không phải màu trục.
                            color: PALETTE.ink,
                            fontSize: 11.5,
                            fontWeight: 600,
                        },
                    },
                ],
            }}
        />
    );
};

// Bar đứng, có thể xếp chồng
export const BarGroupChart: React.FC<
    BaseProps & {
        data: ChartRow[];
        xKey: string;
        series: LineSeries[];
        stacked?: boolean;
        money?: boolean;
    }
> = ({ data, xKey, series, stacked, money = true, height = 290 }) => (
    <Chart
        height={height}
        option={{
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                ...tooltipStyle,
                valueFormatter: (v) => fmt(money)(Number(v)),
            },
            legend:
                series.length > 1
                    ? { ...legendStyle, data: series.map((s) => s.name) }
                    : undefined,
            grid: { ...baseGrid, bottom: series.length > 1 ? 26 : 8 },
            xAxis: categoryAxis(data.map((d) => String(cell(d, xKey)))),
            yAxis: valueAxis(money),
            series: series.map((s, i) => ({
                name: s.name,
                type: 'bar' as const,
                stack: stacked ? 'total' : undefined,
                barMaxWidth: stacked ? 30 : 20,
                itemStyle: {
                    color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length],
                    borderRadius: stacked ? 0 : ([4, 4, 0, 0] as [number, number, number, number]),
                },
                data: data.map((d) => Number(cell(d, s.key) ?? 0)),
            })),
        }}
    />
);

// Combo bar + line hai trục
export const ComboChart: React.FC<
    BaseProps & {
        data: ChartRow[];
        xKey: string;
        barKey: string;
        barName: string;
        lineKey: string;
        lineName: string;
        lineIsPercent?: boolean;
    }
> = ({ data, xKey, barKey, barName, lineKey, lineName, lineIsPercent, height = 290 }) => (
    <Chart
        height={height}
        option={{
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                ...tooltipStyle,
            },
            legend: { ...legendStyle, data: [barName, lineName] },
            grid: { ...baseGrid, bottom: 26 },
            xAxis: categoryAxis(data.map((d) => String(cell(d, xKey)))),
            yAxis: [
                valueAxis(true),
                {
                    type: 'value',
                    axisLabel: {
                        ...axisLabelStyle,
                        formatter: (v: number) => (lineIsPercent ? `${v}%` : axisMoney(v)),
                    },
                    splitLine: { show: false },
                    axisLine: { show: false },
                    axisTick: { show: false },
                },
            ],
            series: [
                {
                    name: barName,
                    type: 'bar',
                    barMaxWidth: 20,
                    itemStyle: { color: PALETTE.navy, borderRadius: [4, 4, 0, 0] },
                    data: data.map((d) => Number(cell(d, barKey) ?? 0)),
                    tooltip: { valueFormatter: (v) => fullVnd(Number(v)) },
                },
                {
                    name: lineName,
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbolSize: 6,
                    lineStyle: { width: 2.4, color: PALETTE.gold },
                    itemStyle: { color: PALETTE.gold },
                    data: data.map((d) => Number(cell(d, lineKey) ?? 0)),
                    tooltip: {
                        valueFormatter: (v) =>
                            lineIsPercent ? `${Number(v).toFixed(2)}%` : axisMoney(Number(v)),
                    },
                },
            ],
        }}
    />
);

// Donut
export const DonutChart: React.FC<
    BaseProps & {
        data: { name: string; value: number }[];
        colors?: readonly string[];
        money?: boolean;
        centerLabel?: string;
        /**
         * Tắt số ở tâm khi con số đó đã hiện ngay cạnh trong cùng một thẻ — in lại
         * lần nữa ở tâm vành khuyên chỉ là lặp. Tắt xong thì lỗ donut không còn phải
         * chứa chuỗi tiền đầy đủ, nên ràng buộc "bán kính trong phải đủ rộng cho chữ
         * 14px" hết hiệu lực và biểu đồ hạ được chiều cao.
         */
        showCenter?: boolean;
        /** Vành dày hơn để hình vẫn đọc được khi đã hạ chiều cao. */
        ring?: 'normal' | 'thick';
    }
> = ({
    data,
    colors = SERIES_COLORS,
    money = true,
    centerLabel,
    height = 280,
    showCenter = true,
    ring = 'normal',
}) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <Chart
            height={height}
            option={{
                tooltip: {
                    trigger: 'item',
                    ...tooltipStyle,
                    formatter: (p: unknown) => {
                        const it = p as { name: string; value: number; percent: number };
                        return `${it.name}<br/><strong>${fmt(money)(it.value)}</strong> · ${it.percent}%`;
                    },
                },
                legend: {
                    ...legendStyle,
                    orient: 'vertical',
                    right: 0,
                    top: 'middle',
                    bottom: undefined,
                    formatter: (name: string) => {
                        const item = data.find((d) => d.name === name);
                        if (!item) return name;
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                        return `${name}  ${pct}%`;
                    },
                },
                series: [
                    {
                        type: 'pie',
                        radius: ring === 'thick' ? ['46%', '80%'] : ['58%', '80%'],
                        center: ['34%', '50%'],
                        avoidLabelOverlap: true,
                        itemStyle: { borderWidth: 2, borderColor: '#fff' },
                        label: {
                            show: showCenter,
                            position: 'center',
                            formatter: () =>
                                `{v|${money ? axisMoney(total) : plainNumber(total)}}\n{l|${centerLabel ?? ''}}`,
                            rich: {
                                // Số đầy đủ dài hơn nhiều so với bản rút gọn — cỡ chữ
                                // vừa phải để không tràn ra ngoài vòng donut.
                                v: {
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: PALETTE.ink,
                                    fontFamily: "'IBM Plex Serif', Georgia, serif",
                                    lineHeight: 20,
                                },
                                l: { fontSize: 10.5, color: PALETTE.axis, lineHeight: 15 },
                            },
                        },
                        emphasis: { label: { show: showCenter } },
                        labelLine: { show: false },
                        data: data.map((d, i) => ({
                            ...d,
                            itemStyle: { color: colors[i % colors.length] },
                        })),
                    },
                ],
            }}
        />
    );
};

// Phễu
export const FunnelChart: React.FC<
    BaseProps & { steps: { label: string; count: number }[] }
> = ({ steps, height = 320 }) => (
    <Chart
        height={height}
        option={{
            tooltip: {
                trigger: 'item',
                ...tooltipStyle,
                formatter: (p: unknown) => {
                    const it = p as { name: string; value: number; dataIndex: number };
                    const prev = it.dataIndex > 0 ? steps[it.dataIndex - 1].count : null;
                    const drop =
                        prev && prev > 0 ? (((prev - it.value) / prev) * 100).toFixed(1) : null;
                    return `${it.name}<br/><strong>${plainNumber(it.value)}</strong> booking${
                        drop ? `<br/>Rơi ${drop}% so với bậc trước` : ''
                    }`;
                },
            },
            grid: baseGrid,
            series: [
                {
                    type: 'funnel',
                    left: '8%',
                    right: '8%',
                    top: 10,
                    bottom: 10,
                    minSize: '24%',
                    sort: 'none',
                    gap: 3,
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: (p: unknown) => {
                            const it = p as { name: string; value: number };
                            return `${it.name}  ${plainNumber(it.value)}`;
                        },
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                    },
                    itemStyle: { borderWidth: 0 },
                    data: steps.map((s, i) => ({
                        name: s.label,
                        value: s.count,
                        itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
                    })),
                },
            ],
        }}
    />
);

// Scatter
export const ScatterChart: React.FC<
    BaseProps & {
        points: { x: number; y: number; size: number; name: string }[];
        xName: string;
        yName: string;
    }
> = ({ points, xName, yName, height = 300 }) => {
    const maxSize = Math.max(...points.map((p) => p.size), 1);
    return (
        <Chart
            height={height}
            option={{
                tooltip: {
                    trigger: 'item',
                    ...tooltipStyle,
                    formatter: (p: unknown) => {
                        const it = p as { data: { name: string; value: number[] } };
                        return `${it.data.name}<br/>${xName}: <strong>${plainNumber(it.data.value[0])}</strong><br/>${yName}: <strong>${fullVnd(it.data.value[1])}</strong>`;
                    },
                },
                grid: { ...baseGrid, bottom: 30, left: 8 },
                xAxis: {
                    type: 'value',
                    name: xName,
                    nameLocation: 'middle',
                    nameGap: 26,
                    nameTextStyle: { color: PALETTE.axis, fontSize: 11 },
                    axisLabel: axisLabelStyle,
                    splitLine: { lineStyle: { color: PALETTE.grid } },
                    axisLine: { show: false },
                    axisTick: { show: false },
                },
                yAxis: valueAxis(true),
                series: [
                    {
                        type: 'scatter',
                        symbolSize: (val: number[]) =>
                            10 + Math.sqrt((val[2] ?? 0) / maxSize) * 26,
                        itemStyle: { color: PALETTE.navy, opacity: 0.68 },
                        emphasis: { itemStyle: { opacity: 1, color: PALETTE.gold } },
                        data: points.map((p) => ({
                            name: p.name,
                            value: [p.x, p.y, p.size],
                        })),
                    },
                ],
            }}
        />
    );
};

// Heatmap
export const HeatmapChart: React.FC<
    BaseProps & {
        rows: string[];
        cols: string[];
        valueAt: (row: string, col: string) => number;
        money?: boolean;
        /** Hậu tố nhãn ô (vd '%') */
        suffix?: string;
    }
> = ({ rows, cols, valueAt, money = true, suffix, height = 300 }) => {
    const cells: [number, number, number][] = [];
    rows.forEach((r, ri) => {
        cols.forEach((c, ci) => {
            cells.push([ci, ri, valueAt(r, c)]);
        });
    });
    const max = Math.max(...cells.map((c) => c[2]), 1);

    return (
        <Chart
            height={height}
            option={{
                tooltip: {
                    ...tooltipStyle,
                    formatter: (p: unknown) => {
                        const it = p as { value: [number, number, number] };
                        const [ci, ri, v] = it.value;
                        const label = suffix
                            ? `${v}${suffix}`
                            : money
                              ? fullVnd(v)
                              : plainNumber(v);
                        return `${rows[ri]} · ${cols[ci]}<br/><strong>${label}</strong>`;
                    },
                },
                grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: cols,
                    position: 'top',
                    axisLabel: axisLabelStyle,
                    axisTick: { show: false },
                    axisLine: { show: false },
                    splitArea: { show: true },
                },
                yAxis: {
                    type: 'category',
                    data: rows,
                    axisLabel: { ...axisLabelStyle, width: 110, overflow: 'truncate' },
                    axisTick: { show: false },
                    axisLine: { show: false },
                    splitArea: { show: true },
                },
                visualMap: {
                    min: 0,
                    max,
                    show: false,
                    inRange: {
                        color: ['rgba(26,34,56,0.06)', PALETTE.navy],
                    },
                },
                series: [
                    {
                        type: 'heatmap',
                        data: cells,
                        label: {
                            show: true,
                            // Ngoại lệ duy nhất còn rút gọn: ô heatmap quá hẹp cho số
                            // đầy đủ. Hover vẫn ra con số chính xác ở tooltip.
                            formatter: (p: unknown) => {
                                const v = (p as { value: [number, number, number] }).value[2];
                                if (v === 0) return '—';
                                if (suffix) return `${v}${suffix}`;
                                if (!money) return plainNumber(v);
                                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}tr`;
                                if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                                return plainNumber(v);
                            },
                            fontSize: 10.5,
                            color: '#fff',
                            textBorderColor: 'transparent',
                        },
                        itemStyle: { borderWidth: 2, borderColor: '#fff', borderRadius: 5 },
                        emphasis: { itemStyle: { borderColor: PALETTE.gold, borderWidth: 2 } },
                    },
                ],
            }}
        />
    );
};
