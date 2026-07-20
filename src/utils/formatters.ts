/**
 * Utility functions for formatting data in Admin Portal
 */

// ============================================
// DATE & TIME FORMATTERS
// ============================================

/**
 * Format ISO date to Vietnamese locale
 * @param dateString - ISO date string
 * @returns Formatted date (DD/MM/YYYY)
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';

  try {
    let safeString = dateString;
    if (!safeString.endsWith('Z') && !safeString.match(/[+-]\d{2}:?\d{2}$/)) {
      safeString += 'Z';
    }
    const date = new Date(safeString);
    return date.toLocaleDateString('vi-VN');
  } catch {
    return 'N/A';
  }
};

/**
 * Format ISO datetime to Vietnamese locale with time
 * @param dateString - ISO datetime string
 * @returns Formatted datetime (DD/MM/YYYY HH:MM)
 */
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A';

  try {
    let safeString = dateString;
    if (!safeString.endsWith('Z') && !safeString.match(/[+-]\d{2}:?\d{2}$/)) {
      safeString += 'Z';
    }
    const date = new Date(safeString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Format date to relative time (e.g., "2 giờ trước", "3 ngày trước")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const formatRelativeTime = (dateString: string): string => {
  console.log('🔍 formatRelativeTime - Input dateString:', dateString);

  let safeString = dateString;
  if (!safeString.endsWith('Z') && !safeString.match(/[+-]\d{2}:?\d{2}$/)) {
    safeString += 'Z';
  }
  const date = new Date(safeString);
  const now = new Date();

  console.log('🔍 formatRelativeTime - Parsed date:', date.toISOString());
  console.log('🔍 formatRelativeTime - Current time:', now.toISOString());

  const diffMs = now.getTime() - date.getTime();
  console.log('🔍 formatRelativeTime - Diff in ms:', diffMs);

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  console.log('🔍 formatRelativeTime - Calculated:', {
    diffMinutes,
    diffHours,
    diffDays,
    diffMonths,
    diffYears
  });

  if (diffMinutes < 1) {
    return 'Vừa xong';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 30) {
    return `${diffDays} ngày trước`;
  } else if (diffMonths < 12) {
    return `${diffMonths} tháng trước`;
  } else {
    return `${diffYears} năm trước`;
  }
};

/**
 * Format time only (HH:MM)
 * @param timeString - Time string (HH:MM:SS or HH:MM)
 * @returns Formatted time (HH:MM)
 */
export const formatTime = (timeString: string | null): string => {
  if (!timeString) return 'N/A';

  // If already in HH:MM format
  if (timeString.length === 5) return timeString;

  // If in HH:MM:SS format, remove seconds
  if (timeString.length === 8) {
    return timeString.substring(0, 5);
  }

  return timeString;
};

/**
 * Format day of week number to Vietnamese name
 * @param day - Day number (0-6, Sunday=0)
 * @returns Vietnamese day name
 */
export const formatDayOfWeek = (day: number): string => {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[day] || 'N/A';
};

// ============================================
// CURRENCY FORMATTERS
// ============================================

/**
 * Format number to Vietnamese currency (VND)
 * @param amount - Amount in VND
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return 'N/A';

  return amount.toLocaleString('vi-VN') + ' VND';
};

/**
 * Format number to currency without VND suffix
 * @param amount - Amount
 * @returns Formatted number with thousand separators
 */
export const formatNumber = (amount: number | null): string => {
  if (amount === null || amount === undefined) return 'N/A';

  return amount.toLocaleString('vi-VN');
};

/**
 * Format number to compact format (e.g., 1.5M, 250K)
 * @param amount - Amount
 * @returns Compact formatted number
 */
export const formatCompactNumber = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + 'B';
  } else if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + 'M';
  } else if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1) + 'K';
  } else {
    return amount.toString();
  }
};

// ============================================
// STATUS FORMATTERS
// ============================================

/**
 * Format profile status to Vietnamese label
 * @param status - Profile status enum
 * @returns Vietnamese label
 */
export const formatProfileStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    onboarding_incomplete: 'Chưa hoàn thành',
    pending_review: 'Chờ xem xét',
    approved: 'Đã phê duyệt',
    rejected: 'Đã từ chối',
    suspended: 'Đã đình chỉ',
    active: 'Hoạt động',
  };

  return statusMap[status] || status;
};

/**
 * Format user status to Vietnamese label
 * @param status - User status
 * @returns Vietnamese label
 */
export const formatUserStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: 'Hoạt động',
    inactive: 'Không hoạt động',
    blocked: 'Đã khóa',
    suspended: 'Đã đình chỉ',
  };

  return statusMap[status] || status;
};

/**
 * Format dispute status to Vietnamese label
 * @param status - Dispute status
 * @returns Vietnamese label
 */
export const formatDisputeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    investigating: 'Đang điều tra',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng',
  };

  return statusMap[status] || status;
};

/**
 * Format dispute type to Vietnamese label
 * @param type - Dispute type
 * @returns Vietnamese label
 */
export const formatDisputeType = (type: string): string => {
  const typeMap: Record<string, string> = {
    no_show_tutor: 'Gia sư vắng mặt',
    no_show_student: 'Học viên vắng mặt',
    poor_quality: 'Chất lượng kém',
    inappropriate_behavior: 'Hành vi không phù hợp',
    payment_issue: 'Vấn đề thanh toán',
    other: 'Khác',
  };

  return typeMap[type] || type;
};

/**
 * Format transaction type to Vietnamese label
 * @param type - Transaction type
 * @returns Vietnamese label
 */
export const formatTransactionType = (type: string): string => {
  const typeMap: Record<string, string> = {
    Deposit: 'Nạp tiền',
    Payment: 'Thanh toán',
    Escrow: 'Giữ tiền',
    EscrowCredit: 'Giữ tiền',
    Release: 'Giải phóng',
    EscrowRelease: 'Giải phóng cho gia sư',
    EscrowReversal: 'Hoàn escrow',
    Refund: 'Hoàn tiền',
    Withdrawal: 'Rút tiền',
    DepositPayment: 'Thanh toán đặt cọc',
    RemainingPayment: 'Thanh toán còn lại',
    BankVerification: 'Xác thực ngân hàng',
    Fee: 'Phí',
  };

  return typeMap[type] || type;
};

/**
 * Format withdrawal status to Vietnamese label
 * @param status - Withdrawal status
 * @returns Vietnamese label
 */
export const formatWithdrawalStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    approved: 'Đang xử lý',
    rejected: 'Đã từ chối',
    completed: 'Hoàn thành',
  };

  return statusMap[status] || status;
};

/**
 * Enhanced withdrawal status formatter
 */
export const formatWithdrawalStatusV2 = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    approved: 'Đang xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    rejected: 'Đã từ chối',
    cancelled: 'Đã hủy',
    delayed: 'Đang tạm giữ',
    pending_review: 'Chờ xét duyệt',
  };

  return statusMap[status] || status;
};

/**
 * Format approval decision internal code to Vietnamese
 */
export const formatApprovalDecision = (decision: string | null): string => {
  if (!decision) return 'Chờ xử lý';
  const decisionMap: Record<string, string> = {
    AUTO_APPROVE: 'Tự động duyệt',
    DELAYED: 'Cần kiểm tra',
    MANUAL_REVIEW: 'Chờ Admin duyệt',
    AUTO_REJECT: 'Tự động từ chối',
  };

  return decisionMap[decision] || decision;
};

/**
 * Format trust score with color label
 */
export const formatTrustScore = (score: number | null): { label: string; color: string } => {
  if (score === null || score === undefined) return { label: 'N/A', color: 'gray' };

  if (score >= 80) return { label: 'An toàn', color: 'green' };
  if (score >= 50) return { label: 'Trung bình', color: 'yellow' };
  if (score >= 30) return { label: 'Rủi ro thấp', color: 'orange' };
  return { label: 'Rủi ro cao', color: 'red' };
};

/**
 * Get estimated processing time based on decision
 */
export const formatEstimatedTime = (decision: string | null): string => {
  if (!decision) return 'Đang cập nhật';
  const timeMap: Record<string, string> = {
    AUTO_APPROVE: '5-30 phút',
    DELAYED: '2-4 giờ',
    MANUAL_REVIEW: '1-24 giờ',
    AUTO_REJECT: 'N/A',
  };

  return timeMap[decision] || 'Chờ xét duyệt';
};

/**
 * Mask bank account number for privacy
 */
export const maskBankAccount = (accountNumber: string | null): string => {
  if (!accountNumber) return 'N/A';
  if (accountNumber.length < 8) return accountNumber;

  const firstPart = accountNumber.substring(0, 4);
  const lastPart = accountNumber.substring(accountNumber.length - 3);
  return `${firstPart}***${lastPart}`;
};

// ============================================
// TEXT FORMATTERS
// ============================================

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export const truncateText = (text: string | null, maxLength: number = 100): string => {
  if (!text) return 'N/A';

  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export const capitalizeWords = (text: string | null): string => {
  if (!text) return '';

  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format phone number to Vietnamese format
 * @param phone - Phone number
 * @returns Formatted phone (0xxx xxx xxx)
 */
export const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return 'N/A';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as 0xxx xxx xxx
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }

  return phone;
};

// ============================================
// PERCENTAGE FORMATTERS
// ============================================

/**
 * Format decimal to percentage
 * @param value - Decimal value (0-1)
 * @returns Percentage string (e.g., "25%")
 */
export const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';

  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Format integer percentage
 * @param value - Integer percentage (0-100)
 * @returns Percentage string (e.g., "25%")
 */
export const formatIntPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';

  return `${value}%`;
};

// ============================================
// RATING FORMATTERS
// ============================================

/**
 * Format rating number
 * @param rating - Rating value (0-5)
 * @returns Formatted rating with star emoji
 */
export const formatRating = (rating: number | null): string => {
  if (rating === null || rating === undefined) return 'N/A';

  return `⭐ ${rating.toFixed(1)}`;
};

// ============================================
// ID FORMATTERS
// ============================================

/**
 * Format user ID to display format
 * @param userId - User ID
 * @returns Formatted ID (e.g., USR-001234)
 */
export const formatUserId = (userId: string | null): string => {
  if (!userId) return 'N/A';

  // If already formatted, return as is
  if (userId.includes('-')) return userId;

  // Format as USR-XXXXXX
  return `USR-${userId}`;
};

/**
 * Format booking ID to display format
 * @param bookingId - Booking ID
 * @returns Formatted ID (e.g., BK-001234)
 */
export const formatBookingId = (bookingId: string | null): string => {
  if (!bookingId) return 'N/A';

  if (bookingId.includes('-')) return bookingId;

  return `BK-${bookingId}`;
};

/**
 * Format dispute ID to display format
 * @param disputeId - Dispute ID
 * @returns Formatted ID (e.g., DSP-001234)
 */
export const formatDisputeId = (disputeId: string | null): string => {
  if (!disputeId) return 'N/A';

  if (disputeId.includes('-')) return disputeId;

  return `DSP-${disputeId}`;
};

// ============================================
// FILE SIZE FORMATTERS
// ============================================

/**
 * Format bytes to human readable size
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
