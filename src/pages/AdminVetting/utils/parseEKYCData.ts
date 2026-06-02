import type { EKYCContent } from '../../../types/admin.types';

/**
 * Parse eKYC raw data JSON string to structured object
 * @param rawData - JSON string from users.ekycRawData
 * @returns Parsed EKYCContent or null if invalid
 */
export const parseEKYCData = (rawData: string | null): EKYCContent | null => {
  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData);
    return parsed as EKYCContent;
  } catch (error) {
    console.error('Error parsing eKYC data:', error);
    return null;
  }
};

/**
 * Format eKYC data for display
 * @param ekycData - Parsed EKYCContent
 * @returns Formatted data object with Vietnamese labels
 */
export const formatEKYCDataForDisplay = (ekycData: EKYCContent | null): Record<string, string> | null => {
  if (!ekycData) return null;

  return {
    'Số CCCD': ekycData.id || 'N/A',
    'Họ và tên': ekycData.name || 'N/A',
    'Ngày sinh': ekycData.dob || 'N/A',
    'Giới tính': ekycData.sex || 'N/A',
    'Quê quán': ekycData.home || 'N/A',
    'Địa chỉ': ekycData.address || 'N/A',
    'Loại thẻ': ekycData.type_new || 'N/A',
    'Độ tin cậy': ekycData.id_prob ? `${ekycData.id_prob}%` : 'N/A',
  };
};

/**
 * Validate eKYC data matches user input
 * @param ekycData - Parsed eKYC data
 * @param userData - User input data
 * @returns Object with validation results
 */
export const validateEKYCMatch = (
  ekycData: EKYCContent | null,
  userData: {
    fullname?: string;
    identitynumber?: string;
    birthdate?: string;
  }
): {
  isValid: boolean;
  mismatches: string[];
} => {
  if (!ekycData) {
    return {
      isValid: false,
      mismatches: ['Không có dữ liệu eKYC'],
    };
  }

  const mismatches: string[] = [];

  // Check name match
  if (userData.fullname && ekycData.name) {
    const normalizedUserName = userData.fullname.toLowerCase().trim();
    const normalizedEKYCName = ekycData.name.toLowerCase().trim();

    if (normalizedUserName !== normalizedEKYCName) {
      mismatches.push(`Tên không khớp: "${userData.fullname}" vs "${ekycData.name}"`);
    }
  }

  // Check ID number match
  if (userData.identitynumber && ekycData.id) {
    const normalizedUserId = userData.identitynumber.replace(/\s/g, '');
    const normalizedEKYCId = ekycData.id.replace(/\s/g, '');

    if (normalizedUserId !== normalizedEKYCId) {
      mismatches.push(`Số CCCD không khớp: "${userData.identitynumber}" vs "${ekycData.id}"`);
    }
  }

  // Check birthdate match (format: DD/MM/YYYY)
  if (userData.birthdate && ekycData.dob) {
    // Convert ISO date to DD/MM/YYYY for comparison
    const userDate = new Date(userData.birthdate);
    const userDOB = `${String(userDate.getDate()).padStart(2, '0')}/${String(userDate.getMonth() + 1).padStart(2, '0')}/${userDate.getFullYear()}`;

    if (userDOB !== ekycData.dob) {
      mismatches.push(`Ngày sinh không khớp: "${userDOB}" vs "${ekycData.dob}"`);
    }
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
  };
};

/**
 * Get eKYC confidence level label
 * @param probability - Confidence probability string (e.g., "99.32")
 * @returns Label and color for display
 */
export const getEKYCConfidenceLevel = (
  probability: string | undefined
): { label: string; color: string } => {
  if (!probability) {
    return { label: 'Không xác định', color: '#94a3b8' };
  }

  const prob = parseFloat(probability);

  if (prob >= 95) {
    return { label: 'Rất cao', color: '#166534' };
  } else if (prob >= 85) {
    return { label: 'Cao', color: '#15803d' };
  } else if (prob >= 70) {
    return { label: 'Trung bình', color: '#92400e' };
  } else {
    return { label: 'Thấp', color: '#991b1b' };
  }
};
