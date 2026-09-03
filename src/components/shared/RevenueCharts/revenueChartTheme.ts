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

/**
 * Font của mọi chart trong cụm. Xuất ra ngoài vì `rich` (nhãn tô nhiều màu) phải khai lại
 * font TƯỜNG MINH cho từng đoạn — đoạn rich không chắc chắn kế thừa font của nhãn cha, mà
 * lệch font ngay giữa một nhãn thì nhìn ra ngay.
 */
export const CHART_FONT = "'IBM Plex Sans', -apple-system, sans-serif";

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
    textStyle: { color: '#f2f0e4', fontSize: 12, fontFamily: CHART_FONT },
    extraCssText: 'border-radius:9px;',
};

export const axisLabelStyle = {
    color: PALETTE.axis,
    fontSize: 11.5,
    fontFamily: CHART_FONT,
};

/** Khung mặc định: lưới ngang mảnh, không kẻ trục đậm. */
export const baseGrid = {
    left: 8,
    right: 16,
    // 10px chỉ vừa đủ để nửa dòng nhãn trục y trên cùng không bị cắt — nhãn 11.5px
    // căn giữa trên đường lưới cao nhất nên tràn lên khoảng 6px. Trước đây để 28px:
    // không chart nào trong cụm khai `title`, legend thì neo `bottom: 0`, mà
    // `containLabel: true` đã tính cả nhãn trục vào rồi — nên 18px còn lại là khoảng
    // trắng chết ở ĐỈNH mọi biểu đồ có trục, nhân với ~20 biểu đồ của 5 tab.
    top: 10,
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

/**
 * Chiều cao cho biểu đồ xếp hạng (thanh ngang), tính theo SỐ DÒNG THẬT.
 *
 * Trước đây mỗi chỗ gọi một con số cứng (420, 340, hoặc `rows * 52 + 60`), nên khi kỳ báo
 * cáo chỉ có ba gia sư thì khung vẫn cao 420px và ba cái thanh trôi trong một vùng trắng.
 * 26px/dòng là vừa đủ cho thanh dày 16px cộng khe thở; 44px là chỗ cho nhãn trục dưới cùng.
 */
export const rankHeight = (rows: number) => Math.max(150, rows * 26 + 44);

export const legendStyle = {
    bottom: 0,
    itemWidth: 10,
    itemHeight: 10,
    icon: 'roundRect',
    textStyle: { color: PALETTE.axis, fontSize: 11, fontFamily: CHART_FONT },
};

/** Gộp option với phần dùng chung để mỗi chart chỉ khai báo phần riêng. */
export const withBase = (option: EChartsOption): EChartsOption => ({
    animationDuration: 420,
    textStyle: { fontFamily: CHART_FONT },
    ...option,
});
