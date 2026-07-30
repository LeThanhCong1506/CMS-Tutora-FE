import type { EChartsOption } from 'echarts';

export const PALETTE = {
    navy: '#1a2238',
    gold: '#d4b483',
    burgundy: '#631b1b',
    green: '#3d4a3e',
    amber: '#f59e0b',
    blue: '#2563eb',
    emerald: '#10b981',
    slate: '#94a3b8',
    red: '#ef4444',
    grid: 'rgba(26, 34, 56, 0.10)',
    // Nhãn trục/nhãn cột phải đọc được rõ trên nền trắng — 0.45 quá chìm,
    // dưới ngưỡng tương phản WCAG AA cho chữ nhỏ.
    axis: 'rgba(26, 34, 56, 0.72)',
    ink: '#1a2238',
} as const;

/** Palette xoay vòng cho chart nhiều chuỗi. */
export const SERIES_COLORS = [
    PALETTE.navy,
    PALETTE.gold,
    PALETTE.blue,
    PALETTE.emerald,
    PALETTE.burgundy,
    PALETTE.amber,
    PALETTE.green,
    PALETTE.slate,
];

const FONT = "'IBM Plex Sans', -apple-system, sans-serif";

/**
 * Tiền tệ trong báo cáo LUÔN hiện đầy đủ và phân cách bằng dấu PHẨY.
 */
const grouped = (v: number): string =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(v));

export const axisMoney = grouped;

export const fullVnd = (v: number): string => `${grouped(v)} VND`;

export const plainNumber = grouped;

/** Nền tooltip đồng nhất toàn hệ thống. */
export const tooltipStyle = {
    backgroundColor: PALETTE.navy,
    borderWidth: 0,
    padding: [9, 12] as [number, number],
    textStyle: { color: '#f2f0e4', fontSize: 12, fontFamily: FONT },
    extraCssText: 'border-radius:9px;',
};

export const axisLabelStyle = {
    color: PALETTE.axis,
    fontSize: 11.5,
    fontFamily: FONT,
};

/** Khung mặc định: lưới ngang mảnh, không kẻ trục đậm. */
export const baseGrid = {
    left: 8,
    right: 16,
    top: 28,
    bottom: 8,
    containLabel: true,
};

export const categoryAxis = (data: string[]) => ({
    type: 'category' as const,
    data,
    axisLabel: axisLabelStyle,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: PALETTE.grid } },
});

export const valueAxis = (money = true) => ({
    type: 'value' as const,
    axisLabel: {
        ...axisLabelStyle,
        formatter: (v: number) => (money ? axisMoney(v) : plainNumber(v)),
    },
    // Nhãn tiền hiện đầy đủ nên khá dài — giảm số vạch để chúng không chen nhau.
    splitNumber: 4,
    splitLine: { lineStyle: { color: PALETTE.grid } },
    axisLine: { show: false },
    axisTick: { show: false },
});

export const legendStyle = {
    bottom: 0,
    itemWidth: 10,
    itemHeight: 10,
    icon: 'roundRect',
    textStyle: { color: PALETTE.axis, fontSize: 11, fontFamily: FONT },
};

/** Gộp option với phần dùng chung để mỗi chart chỉ khai báo phần riêng. */
export const withBase = (option: EChartsOption): EChartsOption => ({
    animationDuration: 420,
    textStyle: { fontFamily: FONT },
    ...option,
});
