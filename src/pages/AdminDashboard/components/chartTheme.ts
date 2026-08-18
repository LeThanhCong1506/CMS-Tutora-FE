/**
 * Bảng màu & helper dùng chung cho các biểu đồ của Admin Dashboard.
 * Bám theo palette thương hiệu trong styles/base/variables.css.
 */

export const CHART = {
  // Brand
  gold: '#d4b483',
  navy: '#1a2238',
  burgundy: '#631b1b',
  green: '#3d4a3e',
  // Semantic (trùng với màu đang dùng trong dashboard hiện tại)
  amber: '#f59e0b',
  blue: '#2563eb',
  emerald: '#10b981',
  slate: '#94a3b8',
  red: '#ef4444',
  // Axis / grid
  grid: 'rgba(26, 34, 56, 0.08)',
  axis: 'rgba(26, 34, 56, 0.45)',
} as const;

/** Màu cho donut phân bổ người dùng (HS / PH / Gia sư / Nhân viên). */
export const USER_ROLE_COLORS = [CHART.navy, CHART.gold, CHART.burgundy, CHART.slate];

/** Màu theo trạng thái khiếu nại (Chờ / Điều tra / Giải quyết / Đóng). */
export const DISPUTE_STATUS_COLORS = [CHART.amber, CHART.blue, CHART.emerald, CHART.slate];

/** Màu theo từng bước phễu duyệt gia sư. */
export const FUNNEL_COLORS = [CHART.slate, CHART.amber, CHART.emerald, CHART.red];

/** Props chung cho trục — giữ font nhỏ, không kẻ trục đậm. */
export const axisProps = {
  tick: { fill: CHART.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;
