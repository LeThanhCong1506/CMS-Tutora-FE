import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    createPolicyDocument,
    getPolicyDocument,
    updatePolicyDocument,
    type PolicyDocument,
} from '../../../services/adminPolicy.service';
import PolicyContentEditor from './PolicyContentEditor';
import { apiErrorMessage } from '../../../utils/apiError';

interface PolicyEditorModalProps {
    /** null = tạo mới. */
    policyDocumentId: number | null;
    readOnly: boolean;
    onClose: () => void;
    onSaved: () => void;
}

/** Thứ tự hiển thị không có ở đây — kéo-thả ngay trên danh sách trực quan hơn ô nhập số. */
interface FormState {
    slug: string;
    title: string;
    summary: string;
    effectiveDate: string;
    contentMarkdown: string;
}

const EMPTY_FORM: FormState = {
    slug: '',
    title: '',
    summary: '',
    effectiveDate: '',
    contentMarkdown: '',
};

const toFormState = (document: PolicyDocument): FormState => ({
    slug: document.slug,
    title: document.title,
    summary: document.summary ?? '',
    // <input type="date"> chỉ nhận YYYY-MM-DD.
    effectiveDate: document.effectiveDate ? document.effectiveDate.slice(0, 10) : '',
    contentMarkdown: document.contentMarkdown,
});

/**
 * Soạn thảo văn bản pháp lý. Nội dung gõ trực tiếp thấy ngay định dạng (xem
 * `PolicyContentEditor`), nhưng vẫn lưu xuống DB dưới dạng Markdown.
 */
const PolicyEditorModal = ({ policyDocumentId, readOnly, onClose, onSaved }: PolicyEditorModalProps) => {
    const isCreate = policyDocumentId === null;
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isCreate) return;

        let cancelled = false;
        (async () => {
            try {
                const document = await getPolicyDocument(policyDocumentId);
                if (!cancelled && document) setForm(toFormState(document));
            } catch (error) {
                if (!cancelled) toast.error(apiErrorMessage(error, 'Không tải được nội dung văn bản.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isCreate, policyDocumentId]);

    const setField = (field: keyof FormState, value: string) =>
        setForm((current) => ({ ...current, [field]: value }));

    const handleSave = async () => {
        if (!form.title.trim() || !form.contentMarkdown.trim()) {
            toast.warning('Tiêu đề và nội dung là bắt buộc.');
            return;
        }
        if (isCreate && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
            toast.warning('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
            return;
        }

        // Không gửi version và displayOrder: backend bỏ qua khi thiếu nên bản đang lưu giữ
        // nguyên giá trị cũ, và thứ tự thì do kéo-thả ở danh sách quyết định.
        const payload = {
            title: form.title.trim(),
            summary: form.summary.trim() || undefined,
            contentMarkdown: form.contentMarkdown,
            effectiveDate: form.effectiveDate || undefined,
        };

        setSaving(true);
        try {
            if (isCreate) {
                await createPolicyDocument({ ...payload, slug: form.slug.trim().toLowerCase() });
                toast.success('Đã tạo văn bản ở dạng nháp. Bấm "Xuất bản" khi sẵn sàng.');
            } else {
                await updatePolicyDocument(policyDocumentId, payload);
                toast.success('Đã lưu văn bản.');
            }
            onSaved();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Không lưu được văn bản.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="policy-modal-backdrop" role="dialog" aria-modal="true" aria-label="Soạn văn bản chính sách">
            <div className="policy-modal">
                <header className="policy-modal__head">
                    <h2>{isCreate ? 'Thêm văn bản chính sách' : readOnly ? 'Xem văn bản' : 'Sửa văn bản'}</h2>
                    <button type="button" className="policy-modal__close" onClick={onClose} aria-label="Đóng">
                        ×
                    </button>
                </header>

                {loading ? (
                    <div className="policy-modal__body policy-modal__loading">Đang tải nội dung…</div>
                ) : (
                    <div className="policy-modal__body">
                        <div className="policy-form-grid">
                            <label>
                                <span>Slug (đường dẫn công khai)</span>
                                <input
                                    value={form.slug}
                                    onChange={(event) => setField('slug', event.target.value)}
                                    placeholder="vd: refund-policy"
                                    /* Khoá slug sau khi tạo: đổi slug làm chết mọi liên kết đã phát hành
                                       và cả ô tick đồng ý đang trỏ tới văn bản này. */
                                    disabled={!isCreate || readOnly}
                                />
                            </label>
                            <label>
                                <span>Hiệu lực từ</span>
                                <input
                                    type="date"
                                    value={form.effectiveDate}
                                    onChange={(event) => setField('effectiveDate', event.target.value)}
                                    disabled={readOnly}
                                />
                            </label>
                        </div>

                        <label className="policy-field">
                            <span>Tiêu đề</span>
                            <input
                                value={form.title}
                                onChange={(event) => setField('title', event.target.value)}
                                disabled={readOnly}
                            />
                        </label>

                        <label className="policy-field">
                            <span>Tóm tắt (hiện dưới tiêu đề trên trang công khai)</span>
                            <input
                                value={form.summary}
                                onChange={(event) => setField('summary', event.target.value)}
                                maxLength={500}
                                disabled={readOnly}
                            />
                        </label>

                        <div className="policy-field">
                            <span>Nội dung</span>
                            <PolicyContentEditor
                                value={form.contentMarkdown}
                                onChange={(next) => setField('contentMarkdown', next)}
                                disabled={readOnly}
                            />
                        </div>
                    </div>
                )}

                <footer className="policy-modal__foot">
                    <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={onClose}>
                        {readOnly ? 'Đóng' : 'Huỷ'}
                    </button>
                    {!readOnly && (
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            disabled={saving || loading}
                            onClick={() => void handleSave()}
                        >
                            {saving ? 'Đang lưu…' : 'Lưu'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default PolicyEditorModal;
