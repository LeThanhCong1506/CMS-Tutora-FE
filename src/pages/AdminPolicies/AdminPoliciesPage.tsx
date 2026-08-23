import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { ColumnDef } from '@tanstack/react-table';
import { ConfirmDialog, FilterTabs, PageContainer, SortableDataTable, StatusBadge } from '../../components/shared';
import type { StatusVariant } from '../../components/shared';
import { Can, useAccess } from '../../contexts/AccessContext';
import { useReorder } from '../../hooks/useReorder';
import { useTabParam } from '../../hooks/useTabParam';
import { formatCalendarDate } from '../../utils/formatters';
import {
    archivePolicyDocument,
    deletePolicyDocumentPermanently,
    getPolicyDocuments,
    reorderPolicyDocuments,
    restorePolicyDocument,
    setPolicyDocumentPublished,
    type PolicyDocumentSummary,
    type PolicyStatus,
} from '../../services/adminPolicy.service';
import PolicyEditorModal from './components/PolicyEditorModal';
import './admin-policies.css';
import { apiErrorMessage } from '../../utils/apiError';

const STATUS_META: Record<PolicyStatus, { label: string; variant: StatusVariant }> = {
    draft: { label: 'Nháp', variant: 'warning' },
    published: { label: 'Đang phát hành', variant: 'success' },
    archived: { label: 'Đã lưu trữ', variant: 'neutral' },
};

const VIEWS = ['active', 'archived'] as const;
type PolicyView = (typeof VIEWS)[number];

const VIEW_TABS = [
    { key: 'active', label: 'Đang dùng' },
    { key: 'archived', label: 'Đã lưu trữ' },
] as const;

/** SortableDataTable cần khoá `id`; văn bản dùng policyDocumentId nên map sang. */
type PolicyRow = PolicyDocumentSummary & { id: number };

/** Thao tác cần xác nhận trước khi chạy. */
type PendingAction =
    | { kind: 'archive'; document: PolicyRow }
    | { kind: 'delete'; document: PolicyRow };

const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/**
 * Quản lý văn bản pháp lý hiển thị trên site công khai (điều khoản, bảo mật, cookie...).
 *
 * Văn bản mới luôn ở dạng nháp; phải bấm "Xuất bản" mới lên trang công khai — tránh một
 * văn bản pháp lý soạn dở lọt ra ngoài giữa chừng.
 *
 * Thứ tự sidebar trang công khai đổi bằng cách kéo-thả ngay trên bảng này, không phải nhập số
 * trong modal: thứ tự là quan hệ giữa các văn bản với nhau nên phải thấy cả danh sách mới sắp
 * được. Chỉ kéo được ở tab "Đang dùng" — bản lưu trữ không hiện ra ngoài nên không có thứ tự.
 *
 * Kho lưu trữ tách hẳn sang tab riêng: đây là nơi duy nhất có nút xoá vĩnh viễn, nên nó không
 * được nằm cạnh các dòng đang phát hành.
 */
const AdminPoliciesPage = () => {
    const { can } = useAccess();
    const canManage = can('policy.manage');

    const [documents, setDocuments] = useState<PolicyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [editorTarget, setEditorTarget] = useState<{ id: number; readOnly: boolean } | { id: null } | null>(null);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [view, setView] = useTabParam<PolicyView>(VIEWS, 'active', { paramKey: 'show' });

    const isArchiveView = view === 'archived';

    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const all = await getPolicyDocuments(isArchiveView);
            // BE chỉ có cờ includeArchived (có/không kèm bản lưu trữ), không lọc riêng được,
            // nên tab kho lưu trữ tự lọc lại. Danh sách văn bản pháp lý rất ngắn.
            const rows = (isArchiveView ? all.filter((item) => item.status === 'archived') : all).map((item) => ({
                ...item,
                id: item.policyDocumentId,
            }));
            setDocuments(rows);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Không tải được danh sách văn bản chính sách.'));
        } finally {
            setLoading(false);
        }
    }, [isArchiveView]);

    useEffect(() => {
        // Loading remote policy state is the synchronization this effect owns; the callback
        // also drives the table's loading indicator before awaiting the request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchDocuments();
    }, [fetchDocuments]);

    const handleReorder = useReorder<PolicyRow>({
        items: documents,
        setItems: setDocuments,
        save: reorderPolicyDocuments,
        applyOrder: (row, order) => ({ ...row, displayOrder: order }),
    });

    const handleTogglePublish = async (document: PolicyRow) => {
        const publish = document.status !== 'published';
        setBusyId(document.id);
        try {
            await setPolicyDocumentPublished(document.id, publish);
            toast.success(publish ? 'Đã xuất bản văn bản.' : 'Đã gỡ khỏi trang công khai.');
            await fetchDocuments();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Không thực hiện được thao tác.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleRestore = async (document: PolicyRow) => {
        setBusyId(document.id);
        try {
            await restorePolicyDocument(document.id);
            toast.success(`Đã khôi phục "${document.title}" về dạng nháp.`);
            await fetchDocuments();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Không khôi phục được văn bản.'));
        } finally {
            setBusyId(null);
        }
    };

    const runPendingAction = async () => {
        if (!pending) return;
        const { kind, document } = pending;
        setBusyId(document.id);
        try {
            if (kind === 'archive') {
                await archivePolicyDocument(document.id);
                toast.success('Đã chuyển vào lưu trữ.');
            } else {
                await deletePolicyDocumentPermanently(document.id);
                toast.success(`Đã xoá vĩnh viễn "${document.title}".`);
            }
            setPending(null);
            await fetchDocuments();
        } catch {
            toast.error(kind === 'archive' ? 'Không lưu trữ được văn bản.' : 'Không xoá được văn bản.');
        } finally {
            setBusyId(null);
        }
    };

    const columns = useMemo<ColumnDef<PolicyRow>[]>(
        () => [
            {
                id: 'title',
                header: 'Văn bản',
                cell: ({ row }) => (
                    <div className="policy-cell">
                        <strong>{row.original.title}</strong>
                        <code>/{row.original.slug}</code>
                    </div>
                ),
            },
            {
                id: 'status',
                header: 'Trạng thái',
                cell: ({ row }) => (
                    <StatusBadge variant={STATUS_META[row.original.status].variant}>
                        {STATUS_META[row.original.status].label}
                    </StatusBadge>
                ),
            },
            {
                id: 'effectiveDate',
                header: 'Hiệu lực từ',
                cell: ({ row }) => formatCalendarDate(row.original.effectiveDate) || '—',
            },
            {
                id: 'updatedAt',
                header: isArchiveView ? 'Lưu trữ lúc' : 'Cập nhật',
                cell: ({ row }) => (
                    <div className="policy-cell">
                        <span>{formatDateTime(row.original.updatedAt)}</span>
                        {row.original.updatedByName && <small>{row.original.updatedByName}</small>}
                    </div>
                ),
            },
            {
                id: 'rowActions',
                header: () => null,
                cell: ({ row }) =>
                    isArchiveView ? (
                        <div className="policy-actions">
                            {/* Chỉ cho xem: muốn sửa thì khôi phục về nháp trước đã. */}
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={() => setEditorTarget({ id: row.original.id, readOnly: true })}
                            >
                                Xem
                            </button>
                            <Can permission="policy.manage">
                                <button
                                    type="button"
                                    className="admin-ui-button admin-ui-button-success"
                                    disabled={busyId === row.original.id}
                                    onClick={() => void handleRestore(row.original)}
                                >
                                    Khôi phục
                                </button>
                                <button
                                    type="button"
                                    className="admin-ui-button admin-ui-button-danger"
                                    disabled={busyId === row.original.id}
                                    onClick={() => setPending({ kind: 'delete', document: row.original })}
                                >
                                    Xoá vĩnh viễn
                                </button>
                            </Can>
                        </div>
                    ) : (
                        <div className="policy-actions">
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={() => setEditorTarget({ id: row.original.id, readOnly: !canManage })}
                            >
                                {canManage ? 'Sửa' : 'Xem'}
                            </button>
                            <Can permission="policy.manage">
                                {/* Nút xanh khi hành động là đưa lên công khai, nút trắng khi là gỡ xuống
                                    nháp (thao tác thu hồi, không nên nổi bật). */}
                                <button
                                    type="button"
                                    className={`admin-ui-button ${
                                        row.original.status === 'published'
                                            ? 'admin-ui-button-secondary'
                                            : 'admin-ui-button-success'
                                    }`}
                                    disabled={busyId === row.original.id}
                                    onClick={() => void handleTogglePublish(row.original)}
                                >
                                    {row.original.status === 'published' ? 'Gỡ xuống nháp' : 'Xuất bản'}
                                </button>
                                <button
                                    type="button"
                                    className="admin-ui-button admin-ui-button-danger"
                                    disabled={busyId === row.original.id}
                                    onClick={() => setPending({ kind: 'archive', document: row.original })}
                                >
                                    Lưu trữ
                                </button>
                            </Can>
                        </div>
                    ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isArchiveView, busyId, canManage],
    );

    return (
        <>
            <PageContainer
                eyebrow="Nội dung"
                eyebrowInfo="Quản lý nội dung, trạng thái xuất bản và thứ tự hiển thị của các văn bản chính sách trên hệ thống."
                title="Văn bản chính sách"
                maxWidth="wide"
                headerAction={
                    !isArchiveView && (
                        <Can permission="policy.manage">
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={() => setEditorTarget({ id: null })}
                            >
                                Thêm văn bản
                            </button>
                        </Can>
                    )
                }
            >
                <div className="policy-list">
                    <div className="policy-list__bar">
                        <FilterTabs
                            tabs={VIEW_TABS}
                            activeKey={view}
                            onChange={(key) => setView(key as PolicyView)}
                            ariaLabel="Lọc văn bản chính sách"
                        />
                    </div>

                    <SortableDataTable
                        data={documents}
                        columns={columns}
                        loading={loading}
                        emptyText={isArchiveView ? 'Kho lưu trữ đang trống.' : 'Chưa có văn bản chính sách nào.'}
                        onReorder={canManage && !isArchiveView ? handleReorder : undefined}
                        reorderDisabledReason={
                            isArchiveView
                                ? 'Bản lưu trữ không hiện trên trang công khai nên không có thứ tự'
                                : 'Bạn không có quyền đổi thứ tự'
                        }
                    />
                </div>
            </PageContainer>

            {editorTarget && (
                <PolicyEditorModal
                    policyDocumentId={editorTarget.id}
                    readOnly={editorTarget.id === null ? !canManage : editorTarget.readOnly}
                    onClose={() => setEditorTarget(null)}
                    onSaved={() => {
                        setEditorTarget(null);
                        void fetchDocuments();
                    }}
                />
            )}

            <ConfirmDialog
                open={pending !== null}
                title={pending?.kind === 'delete' ? 'Xoá vĩnh viễn văn bản?' : 'Chuyển vào lưu trữ?'}
                confirmLabel={pending?.kind === 'delete' ? 'Xoá vĩnh viễn' : 'Lưu trữ'}
                busy={pending !== null && busyId === pending.document.id}
                onCancel={() => setPending(null)}
                onConfirm={() => void runPendingAction()}
                description={
                    pending?.kind === 'delete' ? (
                        <>
                            <p>
                                <strong>{pending.document.title}</strong> sẽ bị xoá khỏi hệ thống. Thao tác này{' '}
                                <strong>không khôi phục lại được</strong>.
                            </p>
                            {pending.document.publishedAt && (
                                <p style={{ marginTop: 8 }}>
                                    Văn bản này từng được phát hành công khai. Nếu có người dùng đã bấm đồng ý với nó,
                                    bạn sẽ không còn bản gốc để đối chiếu khi phát sinh tranh chấp — cân nhắc để nguyên
                                    trong kho lưu trữ thay vì xoá.
                                </p>
                            )}
                        </>
                    ) : (
                        <p>
                            <strong>{pending?.document.title}</strong> sẽ biến mất khỏi trang công khai và chuyển sang
                            tab "Đã lưu trữ". Bạn có thể khôi phục lại sau.
                        </p>
                    )
                }
            />
        </>
    );
};

export default AdminPoliciesPage;
