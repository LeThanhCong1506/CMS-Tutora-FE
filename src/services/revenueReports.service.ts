import type {
    AiRevenueResponse,
    CustomerRevenueResponse,
    RevenueOverviewResponse,
    RevenueRecognitionResponse,
    SubjectRevenueResponse,
    TutorRevenueResponse,
} from '../types/revenueReports.types';
import { apiClient as api } from './apiClient';

/** Khoảng thời gian dùng chung cho mọi báo cáo. */
export interface RevenueRange {
    from?: Date | null;
    to?: Date | null;
}

const rangeParams = (range?: RevenueRange, extra?: Record<string, unknown>) => {
    const params: Record<string, unknown> = { ...(extra || {}) };
    if (range?.from) params.from = range.from.toISOString();
    if (range?.to) params.to = range.to.toISOString();
    return params;
};

export const getRevenueOverview = async (
    range?: RevenueRange,
): Promise<RevenueOverviewResponse> => {
    const { data } = await api.get('/admin/revenue-reports/overview', {
        params: rangeParams(range),
    });
    return data.content;
};

export const getRevenueRecognition = async (
    range?: RevenueRange,
): Promise<RevenueRecognitionResponse> => {
    const { data } = await api.get('/admin/revenue-reports/recognition', {
        params: rangeParams(range),
    });
    return data.content;
};

export const getTutorRevenue = async (
    range?: RevenueRange,
    top = 50,
): Promise<TutorRevenueResponse> => {
    const { data } = await api.get('/admin/revenue-reports/tutors', {
        params: rangeParams(range, { top }),
    });
    return data.content;
};

export const getCustomerRevenue = async (
    range?: RevenueRange,
    top = 50,
): Promise<CustomerRevenueResponse> => {
    const { data } = await api.get('/admin/revenue-reports/customers', {
        params: rangeParams(range, { top }),
    });
    return data.content;
};

export const getSubjectRevenue = async (
    range?: RevenueRange,
): Promise<SubjectRevenueResponse> => {
    const { data } = await api.get('/admin/revenue-reports/subjects', {
        params: rangeParams(range),
    });
    return data.content;
};

export const getAiRevenue = async (
    range?: RevenueRange,
    top = 20,
): Promise<AiRevenueResponse> => {
    const { data } = await api.get('/admin/revenue-reports/ai', {
        params: rangeParams(range, { top }),
    });
    return data.content;
};
