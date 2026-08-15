import axios from 'axios';
import { getCurrentUser } from './auth.service';
// Dùng lại đúng shape các màn danh mục đang gửi, để chia sẻ được hook `useReorder`.
import type { ReorderItem } from './adminLookup.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(
    (config) => {
        const user = getCurrentUser();
        if (user?.accessToken) {
            config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

export type PolicyStatus = 'draft' | 'published' | 'archived';

export interface PolicyDocumentSummary {
    policyDocumentId: number;
    slug: string;
    title: string;
    summary?: string;
    version: string;
    effectiveDate?: string;
    status: PolicyStatus;
    displayOrder: number;
    publishedAt?: string;
    updatedAt: string;
    updatedByName?: string;
}

export interface PolicyDocument extends PolicyDocumentSummary {
    contentMarkdown: string;
}

export interface CreatePolicyDocumentRequest {
    slug: string;
    title: string;
    summary?: string;
    contentMarkdown: string;
    version?: string;
    effectiveDate?: string;
    displayOrder?: number;
}

/** Slug cố ý không nằm trong payload sửa: đổi slug làm chết mọi liên kết đã phát hành. */
export type UpdatePolicyDocumentRequest = Omit<CreatePolicyDocumentRequest, 'slug'>;

interface ApiEnvelope<T> {
    content: T;
    statusCode: number;
    message: string;
}

export const getPolicyDocuments = async (includeArchived = false): Promise<PolicyDocumentSummary[]> => {
    const response = await api.get<ApiEnvelope<PolicyDocumentSummary[]>>('/admin/policies', {
        params: { includeArchived },
    });
    return response.data.content ?? [];
};

export const getPolicyDocument = async (id: number): Promise<PolicyDocument | null> => {
    const response = await api.get<ApiEnvelope<PolicyDocument>>(`/admin/policies/${id}`);
    return response.data.content ?? null;
};

export const createPolicyDocument = async (request: CreatePolicyDocumentRequest): Promise<PolicyDocument> => {
    const response = await api.post<ApiEnvelope<PolicyDocument>>('/admin/policies', request);
    return response.data.content;
};

export const updatePolicyDocument = async (
    id: number,
    request: UpdatePolicyDocumentRequest,
): Promise<PolicyDocument> => {
    const response = await api.put<ApiEnvelope<PolicyDocument>>(`/admin/policies/${id}`, request);
    return response.data.content;
};

export const setPolicyDocumentPublished = async (id: number, publish: boolean): Promise<PolicyDocument> => {
    const response = await api.patch<ApiEnvelope<PolicyDocument>>(`/admin/policies/${id}/published`, null, {
        params: { publish },
    });
    return response.data.content;
};

/** Xoá mềm — backend chuyển sang trạng thái `archived`, không xoá cứng. */
export const archivePolicyDocument = async (id: number): Promise<void> => {
    await api.delete(`/admin/policies/${id}`);
};

/** Đưa văn bản khỏi kho lưu trữ. Backend trả về dạng nháp, không phát hành thẳng. */
export const restorePolicyDocument = async (id: number): Promise<PolicyDocument> => {
    const response = await api.patch<ApiEnvelope<PolicyDocument>>(`/admin/policies/${id}/restore`);
    return response.data.content;
};

/** Xoá cứng khỏi DB. Backend chỉ chấp nhận với văn bản đang ở trạng thái `archived`. */
export const deletePolicyDocumentPermanently = async (id: number): Promise<void> => {
    await api.delete(`/admin/policies/${id}/permanent`);
};

/**
 * Gán lại thứ tự hiển thị cho cả danh sách — đây là thứ tự các văn bản xếp trên sidebar trang
 * công khai. Gửi nguyên mảng nên một lần kéo-thả chỉ tốn một request.
 */
export const reorderPolicyDocuments = async (items: ReorderItem[]): Promise<void> => {
    await api.put('/admin/policies/reorder', { items });
};
