/**
 * Chi phí gọi Gemini — token và tiền trả Google.
 */

export interface AiUsageTotals {
  calls: number;
  totalTokens: number;
  promptTokens: number;
  outputTokens: number;
  /** Token "thinking" — Google tính giá như output. */
  thoughtsTokens: number;
  cachedTokens: number;
  costUsd: number;
  failedCalls: number;
  avgLatencyMs: number | null;

  /** Kỳ liền trước cùng độ dài, để tính % thay đổi. */
  prevCalls: number;
  prevCostUsd: number;
  prevTotalTokens: number;
}

export interface AiUsagePoint {
  /** ISO date 'YYYY-MM-DD'. */
  date: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
}

export interface AiUsageBreakdown {
  /** Tên model ('gemini-2.5-flash') hoặc tên feature ('solve'). */
  key: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
  failedCalls: number;
  /** % chi phí trên tổng kỳ, BE tính sẵn. */
  costShare: number;
}

export interface AiUsageResponse {
  totals: AiUsageTotals;
  timeline: AiUsagePoint[];
  byModel: AiUsageBreakdown[];
  byFeature: AiUsageBreakdown[];
}

/** Khoảng thời gian nhanh trên toolbar. */
export type AiUsageRange = '7d' | '30d' | '90d';

export const AI_USAGE_RANGE_DAYS: Record<AiUsageRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export const AI_USAGE_RANGE_LABEL: Record<AiUsageRange, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '90d': '90 ngày',
};

/**
 * Nhãn tiếng Việt cho feature do tutora-ai gắn. Thiếu nhãn thì hiện nguyên key
 * (thêm feature mới ở tutora-ai không làm vỡ trang).
 */
export const AI_FEATURE_LABEL: Record<string, string> = {
  solve: 'Giải bài tập',
  solve_thinking: 'Giải bài tập (suy nghĩ)',
  homework_classify: 'Phân loại bài toán',
  homework_ocr_image: 'OCR ảnh bài tập',
  homework_ocr_url: 'OCR ảnh (URL)',
  homework_extract_pdf: 'Trích câu hỏi từ PDF',
  question_bank_embed: 'Embed ngân hàng câu hỏi',
  classroom_generate_practice: 'Sinh đề ôn tập',
  classroom_extract_image: 'Trích tài liệu lớp học',
  assessment_analyze: 'Phân tích bài đánh giá',
  zalo_agent: 'Trợ lý Zalo',
  zalo_session_memory: 'Tóm tắt phiên Zalo',
  web_agent_router: 'Trợ lý web (định tuyến)',
  web_agent_faq: 'Trợ lý web (FAQ)',
  web_agent_consult: 'Trợ lý web (tư vấn)',
  web_agent_tutor: 'Trợ lý web (gợi ý gia sư)',
  web_agent_tutor_info: 'Trợ lý web (thông tin gia sư)',
  tutor_matching_embed: 'Tìm gia sư (embed)',
  tutor_profile_embed: 'Embed hồ sơ gia sư',
  rag_embed: 'RAG (embed)',
  kb_retrieve_embed: 'Tra cứu tri thức',
  kb_ingest_embed: 'Nạp tri thức',
};

/**
 * Tỉ giá USD→VND để hiển thị chi phí. Google tính bằng USD nên DB lưu USD;
 * quy đổi chỉ phục vụ hiển thị.
 */
export interface AiUsageRate {
  rate: number;
  /** true = admin nhập tay, false = lấy từ API tỉ giá thị trường. */
  isManual: boolean;
  updatedAt: string | null;
  source: string;
}
