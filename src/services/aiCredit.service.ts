import type {
  AiCreditPackage,
  CreateAiCreditPackageBody,
  UpdateAiCreditPackageBody,
  BookingBonusConfig,
} from '../types/aiCredit.types';
import { apiClient as api } from './apiClient';

export const getAiCreditPackages = async (): Promise<AiCreditPackage[]> => {
  const { data } = await api.get<AiCreditPackage[]>('/admin/ai-credit/packages');
  return (Array.isArray(data) ? data : (data as { content?: AiCreditPackage[] }).content) ?? [];
};

export const createAiCreditPackage = async (
  body: CreateAiCreditPackageBody,
): Promise<AiCreditPackage> => {
  const { data } = await api.post('/admin/ai-credit/packages', body);
  return (data as { content?: AiCreditPackage }).content ?? data;
};

export const updateAiCreditPackage = async (
  packageId: number,
  body: UpdateAiCreditPackageBody,
): Promise<AiCreditPackage> => {
  const { data } = await api.put(`/admin/ai-credit/packages/${packageId}`, body);
  return (data as { content?: AiCreditPackage }).content ?? data;
};

export const deleteAiCreditPackage = async (packageId: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/admin/ai-credit/packages/${packageId}`);
  return data;
};

export const uploadAiCreditPackageIcon = async (
  packageId: number,
  file: File,
): Promise<AiCreditPackage> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/admin/ai-credit/packages/${packageId}/icon`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (data as { content?: AiCreditPackage }).content ?? data;
};

export const getBookingBonus = async (): Promise<BookingBonusConfig> => {
  const { data } = await api.get('/admin/ai-credit/config/booking-bonus');
  return (data as { content?: BookingBonusConfig }).content ?? data;
};

export const updateBookingBonus = async (amount: number): Promise<BookingBonusConfig> => {
  const { data } = await api.put('/admin/ai-credit/config/booking-bonus', { amount });
  return (data as { content?: BookingBonusConfig }).content ?? data;
};
