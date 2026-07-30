/**
 * ⚠️ TEMP MOCK DATA — for UI preview/comparison only.
 * The tax management backend (TutorTaxProfile, TaxWithholdingRecord, TaxDeclarationBatch)
 * does not exist yet — see docs/finance-tax-management-spec.md.
 * Delete this whole file (and its imports in src/pages/AdminTax/**) once the real
 * BE endpoints ship and the page is wired to services/adminTax.service.ts instead.
 *
 * Cơ sở pháp lý đã xác nhận (2026-07-28) — xem docs/finance-tax-management-spec.md mục D:
 * - "Dạy học, dạy nghề" KHÔNG chịu thuế GTGT (khoản 13 Điều 5 Luật thuế GTGT, làm rõ tại
 *   khoản 7 Điều 4 Nghị định 181/2025/NĐ-CP; Phụ lục I TT40/2021/TT-BTC dòng "Giáo dục và
 *   đào tạo": GTGT 0%, TNCN 2%). Chỉ khấu trừ TNCN, không khấu trừ VAT.
 * - Ngưỡng miễn thuế hiện hành: 1.000.000.000đ/năm (nâng dần 100tr → 200tr từ 1/1/2026 →
 *   500tr → 1 tỷ từ 29/4/2026 theo NĐ 141/2026/NĐ-CP sửa NĐ 68/2026/NĐ-CP).
 * - Theo tiền lệ Grab/Be (NĐ 117/2025/NĐ-CP, hiệu lực 1/7/2025): nền tảng khấu trừ TRÊN MỌI
 *   GIAO DỊCH, không tự xét miễn trừ theo ngưỡng trước — gia sư dưới ngưỡng tự làm thủ tục
 *   hoàn thuế với cơ quan thuế sau, dùng chứng từ khấu trừ do nền tảng cấp.
 */

export interface TaxOverviewMetrics {
    taxableRevenueThisMonth: number;
    tutorsWithRevenueThisMonth: number;
    totalPitWithheld: number;
    /** Doanh thu luỹ kế năm cao nhất trong số gia sư — để admin thấy còn cách ngưỡng bao xa, không phải cảnh báo. */
    topTutorRevenueThisYear: number;
    topTutorThresholdPercent: number;
    exemptionThreshold: number;
    lastDeclarationPeriod: string;
    lastDeclarationStatus: 'draft' | 'declared' | 'submitted';
    lastDeclarationAmount: number;
    /** TNCN khấu trừ theo tháng — không còn VAT vì dạy học miễn GTGT. */
    monthlyTrend: { label: string; pit: number }[];
}

export const mockTaxOverview: TaxOverviewMetrics = {
    taxableRevenueThisMonth: 201_800_000,
    tutorsWithRevenueThisMonth: 312,
    totalPitWithheld: 5_700_000,
    topTutorRevenueThisYear: 96_400_000,
    topTutorThresholdPercent: 10,
    exemptionThreshold: 1_000_000_000,
    lastDeclarationPeriod: 'Tháng 06/2026',
    lastDeclarationStatus: 'submitted',
    lastDeclarationAmount: 5_200_000,
    monthlyTrend: [
        { label: 'T2', pit: 3_600_000 },
        { label: 'T3', pit: 4_200_000 },
        { label: 'T4', pit: 3_900_000 },
        { label: 'T5', pit: 4_800_000 },
        { label: 'T6', pit: 5_200_000 },
        { label: 'T7', pit: 5_700_000 },
    ],
};

/**
 * Đã bỏ "loại hình" (cá nhân/hộ kinh doanh) khỏi mô hình — xác nhận qua Mẫu 01-1/BK-CNKD
 * (TT40/2021) và Mẫu 01-1/BK-CNKD-TMĐT (NĐ 117/2025) đều chỉ cần định danh (MST/tên) +
 * doanh thu + số thuế, không có trường phân loại. Vì MST hộ kinh doanh = CCCD chủ hộ từ
 * 1/7/2025, CCCD đã xác minh sẵn (bắt buộc để duyệt hồ sơ gia sư) là đủ để xuất chứng từ —
 * không cần thu thập/duyệt gì thêm cho mục đích thuế. Xem docs/finance-tax-management-spec.md mục D/E.
 *
 * Cũng đã bỏ "trạng thái xác minh CCCD" — CCCD là 1 trong 5 điều kiện bắt buộc để gia sư
 * được duyệt hồ sơ và mở booking (TutorService.cs); gia sư có doanh thu tức đã có CCCD xác
 * minh 100%, không tồn tại ca "thiếu CCCD" đối với gia sư đang hoạt động. Không cần hiển thị
 * trạng thái này trong module thuế nữa.
 */
export interface TutorTaxProfile {
    tutorId: string;
    tutorName: string;
    tutorEmail: string;
    /** CCCD đã xác minh qua eKYC khi duyệt hồ sơ gia sư (users.identity_number) — nguồn định danh chính, không thu thập lại. */
    identityNumber: string;
    /** MST khác CCCD, gia sư tự nguyện cung cấp — hiếm (VD: MST cấp trước cải cách 1/7/2025 chưa migrate). */
    alternateTaxCode: string | null;
    cumulativeRevenueThisYear: number;
    thresholdPercent: number;
}

export const mockTutorTaxProfiles: TutorTaxProfile[] = [
    {
        tutorId: 'TUT-1042',
        tutorName: 'Nguyễn Văn An',
        tutorEmail: 'an.nguyen@tutora.vn',
        identityNumber: '079202XXXXXX',
        alternateTaxCode: null,
        cumulativeRevenueThisYear: 82_700_000,
        thresholdPercent: 8,
    },
    {
        tutorId: 'TUT-1078',
        tutorName: 'Trần Thị Bích',
        tutorEmail: 'bich.tran@tutora.vn',
        identityNumber: '025198XXXXXX',
        alternateTaxCode: null,
        cumulativeRevenueThisYear: 88_100_000,
        thresholdPercent: 9,
    },
    {
        tutorId: 'TUT-1103',
        tutorName: 'Lê Hoàng Nam',
        tutorEmail: 'nam.le@tutora.vn',
        identityNumber: '036201XXXXXX',
        alternateTaxCode: '801XXXX229',
        cumulativeRevenueThisYear: 96_400_000,
        thresholdPercent: 10,
    },
    {
        tutorId: 'TUT-1155',
        tutorName: 'Phạm Thu Trang',
        tutorEmail: 'trang.pham@tutora.vn',
        identityNumber: '001199XXXXXX',
        alternateTaxCode: null,
        cumulativeRevenueThisYear: 80_500_000,
        thresholdPercent: 8,
    },
    {
        tutorId: 'TUT-1210',
        tutorName: 'Đỗ Quang Huy',
        tutorEmail: 'huy.do@tutora.vn',
        identityNumber: '048200XXXXXX',
        alternateTaxCode: null,
        cumulativeRevenueThisYear: 41_200_000,
        thresholdPercent: 4,
    },
];

export type DeclarationStatus = 'draft' | 'declared' | 'submitted';

export interface TaxDeclarationPeriod {
    id: string;
    periodLabel: string;
    taxableRevenue: number;
    pitAmount: number;
    status: DeclarationStatus;
}

export const mockTaxDeclarations: TaxDeclarationPeriod[] = [
    { id: 'DEC-2026-07', periodLabel: 'Tháng 07/2026', taxableRevenue: 201_800_000, pitAmount: 5_700_000, status: 'draft' },
    { id: 'DEC-2026-06', periodLabel: 'Tháng 06/2026', taxableRevenue: 182_300_000, pitAmount: 5_200_000, status: 'submitted' },
    { id: 'DEC-2026-05', periodLabel: 'Tháng 05/2026', taxableRevenue: 168_400_000, pitAmount: 4_800_000, status: 'submitted' },
    { id: 'DEC-2026-04', periodLabel: 'Tháng 04/2026', taxableRevenue: 137_300_000, pitAmount: 3_900_000, status: 'declared' },
];

export interface TaxWithholdingRecord {
    id: string;
    bookingCode: string;
    tutorName: string;
    /** Doanh thu gộp — giá dịch vụ gia sư, TRƯỚC khi trừ phí nền tảng. TNCN tính trên số này
     * (không được trừ phí sàn trước khi tính thuế — Điểm d Khoản 2 Điều 5 NĐ 117/2025/NĐ-CP). */
    grossAmount: number;
    platformFeeAmount: number;
    pitAmount: number;
    netAmount: number;
}

export const mockWithholdingRecords: TaxWithholdingRecord[] = [
    { id: 'WH-1', bookingCode: 'BK-88213', tutorName: 'Nguyễn Văn An', grossAmount: 1_500_000, platformFeeAmount: 75_000, pitAmount: 30_000, netAmount: 1_395_000 },
    { id: 'WH-2', bookingCode: 'BK-88204', tutorName: 'Lê Hoàng Nam', grossAmount: 2_100_000, platformFeeAmount: 105_000, pitAmount: 42_000, netAmount: 1_953_000 },
    { id: 'WH-3', bookingCode: 'BK-88190', tutorName: 'Phạm Thu Trang', grossAmount: 900_000, platformFeeAmount: 45_000, pitAmount: 18_000, netAmount: 837_000 },
    { id: 'WH-4', bookingCode: 'BK-88177', tutorName: 'Đỗ Quang Huy', grossAmount: 1_200_000, platformFeeAmount: 60_000, pitAmount: 24_000, netAmount: 1_116_000 },
];

export interface TaxConfigHistoryEntry {
    effectiveFrom: string;
    pitRate: number;
    exemptionThreshold: number;
    legalBasis: string;
    updatedBy: string;
}

export interface TaxConfig {
    /** Dạy học/gia sư miễn thuế GTGT theo luật — giữ để hiển thị, không cho chỉnh. */
    vatRate: 0;
    pitRate: number;
    exemptionThreshold: number;
    effectiveFrom: string;
    legalBasis: string;
    history: TaxConfigHistoryEntry[];
}

export const mockTaxConfig: TaxConfig = {
    vatRate: 0,
    pitRate: 2,
    exemptionThreshold: 1_000_000_000,
    effectiveFrom: '2026-04-29',
    legalBasis: 'NĐ 141/2026/NĐ-CP',
    history: [
        { effectiveFrom: '29/04/2026', pitRate: 2, exemptionThreshold: 1_000_000_000, legalBasis: 'NĐ 141/2026/NĐ-CP', updatedBy: 'AD Minh' },
        { effectiveFrom: '01/01/2026', pitRate: 2, exemptionThreshold: 200_000_000, legalBasis: 'Luật Thuế TNCN, GTGT sửa đổi', updatedBy: 'AD Minh' },
        { effectiveFrom: '01/07/2025', pitRate: 2, exemptionThreshold: 100_000_000, legalBasis: 'TT40/2021/TT-BTC', updatedBy: 'AD Hằng' },
    ],
};

export type TaxConfigProposalStatus = 'pending_approval';

export interface TaxConfigProposal {
    id: string;
    pitRate: number;
    exemptionThreshold: number;
    effectiveFrom: string;
    legalBasis: string;
    /** Nghiệp vụ: Staff tạo & gửi đề xuất, chỉ Admin mới có quyền duyệt (tách biệt người đề xuất/người duyệt). */
    proposedBy: string;
    proposedByRole: 'staff' | 'admin';
    proposedAt: string;
    status: TaxConfigProposalStatus;
}

/** Set to null to preview the empty state (no pending proposal). */
export const mockTaxConfigProposal: TaxConfigProposal | null = {
    id: 'PROP-1',
    pitRate: 2,
    exemptionThreshold: 1_200_000_000,
    effectiveFrom: '2026-09-01',
    legalBasis: 'Dự thảo sửa đổi TT40/2021/TT-BTC (đang lấy ý kiến)',
    proposedBy: 'NV Hằng',
    proposedByRole: 'staff',
    proposedAt: '2026-07-25T10:00:00Z',
    status: 'pending_approval',
};

// ===== B6: Chứng từ khấu trừ TNCN =====
// Cấp theo GIA SƯ × KỲ (tổng hợp mọi giao dịch trong tháng đó) — thực tế nhất vì kê khai
// cũng gộp theo kỳ (mục B5). Chỉ cấp cho kỳ đã kê khai/nộp xong (không cấp cho kỳ "Nháp").
// Mẫu chứng từ cụ thể (số hiệu, bố cục) còn cần xác nhận khi build BE thật — xem mục B6 spec.

export type CertificateStatus = 'issued' | 'not_issued';

export interface TaxWithholdingCertificate {
    id: string;
    tutorId: string;
    tutorName: string;
    identityNumber: string | null;
    periodLabel: string;
    taxableRevenue: number;
    pitWithheld: number;
    issuedAt: string | null;
    status: CertificateStatus;
}

export const mockWithholdingCertificates: TaxWithholdingCertificate[] = [
    { id: 'CERT-2607-1042', tutorId: 'TUT-1042', tutorName: 'Nguyễn Văn An', identityNumber: '079202XXXXXX', periodLabel: 'Tháng 07/2026', taxableRevenue: 8_400_000, pitWithheld: 168_000, issuedAt: null, status: 'not_issued' },
    { id: 'CERT-2607-1103', tutorId: 'TUT-1103', tutorName: 'Lê Hoàng Nam', identityNumber: '036201XXXXXX', periodLabel: 'Tháng 07/2026', taxableRevenue: 11_200_000, pitWithheld: 224_000, issuedAt: null, status: 'not_issued' },
    { id: 'CERT-2607-1155', tutorId: 'TUT-1155', tutorName: 'Phạm Thu Trang', identityNumber: '001199XXXXXX', periodLabel: 'Tháng 07/2026', taxableRevenue: 6_300_000, pitWithheld: 126_000, issuedAt: null, status: 'not_issued' },
    { id: 'CERT-2607-1210', tutorId: 'TUT-1210', tutorName: 'Đỗ Quang Huy', identityNumber: '048200XXXXXX', periodLabel: 'Tháng 07/2026', taxableRevenue: 5_100_000, pitWithheld: 102_000, issuedAt: null, status: 'not_issued' },
    { id: 'CERT-2606-1042', tutorId: 'TUT-1042', tutorName: 'Nguyễn Văn An', identityNumber: '079202XXXXXX', periodLabel: 'Tháng 06/2026', taxableRevenue: 7_900_000, pitWithheld: 158_000, issuedAt: '2026-07-05T09:00:00Z', status: 'issued' },
    { id: 'CERT-2606-1103', tutorId: 'TUT-1103', tutorName: 'Lê Hoàng Nam', identityNumber: '036201XXXXXX', periodLabel: 'Tháng 06/2026', taxableRevenue: 10_500_000, pitWithheld: 210_000, issuedAt: '2026-07-05T09:00:00Z', status: 'issued' },
    { id: 'CERT-2606-1155', tutorId: 'TUT-1155', tutorName: 'Phạm Thu Trang', identityNumber: '001199XXXXXX', periodLabel: 'Tháng 06/2026', taxableRevenue: 5_800_000, pitWithheld: 116_000, issuedAt: '2026-07-05T09:00:00Z', status: 'issued' },
    { id: 'CERT-2606-1210', tutorId: 'TUT-1210', tutorName: 'Đỗ Quang Huy', identityNumber: '048200XXXXXX', periodLabel: 'Tháng 06/2026', taxableRevenue: 4_700_000, pitWithheld: 94_000, issuedAt: '2026-07-05T09:00:00Z', status: 'issued' },
];

// ===== B8: Báo cáo thuế =====

export interface TaxReportByTutorRow {
    tutorId: string;
    tutorName: string;
    taxableRevenue: number;
    pitWithheld: number;
    certificatesIssued: number;
}

/** Tổng hợp theo gia sư từ mockWithholdingCertificates (2 kỳ gần nhất) — dùng cho báo cáo "theo gia sư". */
export const mockTaxReportByTutor: TaxReportByTutorRow[] = [
    { tutorId: 'TUT-1103', tutorName: 'Lê Hoàng Nam', taxableRevenue: 21_700_000, pitWithheld: 434_000, certificatesIssued: 1 },
    { tutorId: 'TUT-1042', tutorName: 'Nguyễn Văn An', taxableRevenue: 16_300_000, pitWithheld: 326_000, certificatesIssued: 1 },
    { tutorId: 'TUT-1155', tutorName: 'Phạm Thu Trang', taxableRevenue: 12_100_000, pitWithheld: 242_000, certificatesIssued: 1 },
    { tutorId: 'TUT-1210', tutorName: 'Đỗ Quang Huy', taxableRevenue: 9_800_000, pitWithheld: 196_000, certificatesIssued: 1 },
];
