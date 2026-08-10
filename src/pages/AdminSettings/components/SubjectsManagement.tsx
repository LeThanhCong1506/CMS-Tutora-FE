import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable, FilterTabs, SectionCard, StatusBadge } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { Can } from '../../../contexts/AccessContext';
import type { Subject } from '../mockData';
import {
    formatGradeLevels,
    mockDeleteSubject,
    mockGetSubjects,
    mockRestoreSubject,
} from '../mockData';
import SubjectModal from './SubjectModal';
import { useClientPagination } from '../../../hooks/useClientPagination';
import { useTabParam } from '../../../hooks/useTabParam';

const FILTER_STATUSES = ['all', 'active', 'inactive'] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

const getSubjectIcon = (subjectName: string) => {
    if (subjectName.includes('Toán')) return 'calculate';
    if (subjectName.includes('Văn') || subjectName.includes('Ngữ')) return 'menu_book';
    if (
        subjectName.includes('Tiếng') ||
        subjectName.includes('IELTS') ||
        subjectName.includes('TOEFL') ||
        subjectName.includes('SAT')
    ) {
        return 'translate';
    }
    if (subjectName.includes('Lý')) return 'science';
    if (subjectName.includes('Hóa')) return 'experiment';
    if (subjectName.includes('Sinh')) return 'eco';
    if (subjectName.includes('Lịch sử')) return 'history_edu';
    if (subjectName.includes('Địa')) return 'public';
    if (subjectName.includes('Âm nhạc')) return 'music_note';
    if (subjectName.includes('Mỹ thuật')) return 'palette';
    if (subjectName.includes('Lập trình') || subjectName.includes('Scratch') || subjectName.includes('Python')) {
        return 'code';
    }
    return 'school';
};

const SubjectsManagement = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    // Param riêng (`?status=`) — trang cha AdminSettings đã dùng `?tab=`.
    const [filterStatus, setFilterStatus] = useTabParam<FilterStatus>(FILTER_STATUSES, 'active', {
        paramKey: 'status',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

    const fetchSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mockGetSubjects(false);
            setSubjects(data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Không thể tải danh sách môn học');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchSubjects();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchSubjects]);

    const activeCount = useMemo(() => subjects.filter((subject) => subject.isactive).length, [subjects]);
    const inactiveCount = subjects.length - activeCount;

    const filteredSubjects = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return subjects.filter((subject) => {
            const matchesStatus =
                filterStatus === 'all' ||
                (filterStatus === 'active' && subject.isactive) ||
                (filterStatus === 'inactive' && !subject.isactive);

            const matchesSearch =
                !normalizedQuery ||
                subject.subjectname.toLowerCase().includes(normalizedQuery) ||
                subject.description?.toLowerCase().includes(normalizedQuery);

            return matchesStatus && matchesSearch;
        });
    }, [filterStatus, searchQuery, subjects]);

    const { page, setPage, pageItems: pagedSubjects, total, pageSize } =
        useClientPagination(filteredSubjects);

    const handleAddSubject = () => {
        setEditingSubject(null);
        setIsModalOpen(true);
    };

    const handleEditSubject = (subject: Subject) => {
        setEditingSubject(subject);
        setIsModalOpen(true);
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (deletingSubjectId !== subjectId) {
            setDeletingSubjectId(subjectId);
            window.setTimeout(() => setDeletingSubjectId(null), 5000);
            return;
        }

        try {
            await mockDeleteSubject(subjectId);
            toast.success('Đã xóa môn học thành công');
            await fetchSubjects();
            setDeletingSubjectId(null);
        } catch (error) {
            console.error('Error deleting subject:', error);
            toast.error('Không thể xóa môn học');
        }
    };

    const handleRestoreSubject = async (subjectId: string) => {
        try {
            await mockRestoreSubject(subjectId);
            toast.success('Đã khôi phục môn học');
            await fetchSubjects();
        } catch (error) {
            console.error('Error restoring subject:', error);
            toast.error('Không thể khôi phục môn học');
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingSubject(null);
    };

    const handleModalSuccess = async () => {
        setIsModalOpen(false);
        setEditingSubject(null);
        await fetchSubjects();
    };

    const columns: DataTableColumn<Subject>[] = [
        {
            key: 'subject',
            title: 'Môn học',
            minWidth: 240,
            render: (subject) => (
                <div className="admin-ui-entity subject-name-cell">
                    <span className="material-symbols-outlined subject-icon">
                        {getSubjectIcon(subject.subjectname)}
                    </span>
                    <div>
                        <span className="admin-ui-entity-primary">{subject.subjectname}</span>
                        <span className="admin-ui-entity-secondary">ID: {subject.subjectid}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'grades',
            title: 'Khối lớp',
            minWidth: 180,
            render: (subject) => <span className="admin-ui-table-meta">{formatGradeLevels(subject.gradelevels)}</span>,
        },
        {
            key: 'description',
            title: 'Mô tả',
            minWidth: 260,
            render: (subject) => (
                <span className="subject-description-cell">
                    {subject.description || 'Chưa có mô tả'}
                </span>
            ),
        },
        {
            key: 'status',
            title: 'Trạng thái',
            align: 'center',
            width: 140,
            render: (subject) => (
                <StatusBadge variant={subject.isactive ? 'success' : 'neutral'}>
                    {subject.isactive ? 'Hoạt động' : 'Đã xóa'}
                </StatusBadge>
            ),
        },
        {
            key: 'actions',
            title: 'Thao tác',
            align: 'right',
            width: 150,
            render: (subject) => (
                <div className="admin-ui-actions subjects-table-actions">
                    {subject.isactive ? (
                        <>
                            <Can permission="lookup.update">
                            <button
                                className="admin-ui-button admin-ui-button-secondary subject-inline-action"
                                onClick={() => handleEditSubject(subject)}
                                type="button"
                                title="Chỉnh sửa"
                            >
                                <span className="material-symbols-outlined">edit</span>
                            </button>
                            </Can>
                            <Can permission="lookup.delete">
                            <button
                                className={`admin-ui-button subject-inline-action ${
                                    deletingSubjectId === subject.subjectid
                                        ? 'admin-ui-button-danger'
                                        : 'admin-ui-button-secondary'
                                }`}
                                onClick={() => void handleDeleteSubject(subject.subjectid)}
                                type="button"
                                title={
                                    deletingSubjectId === subject.subjectid
                                        ? 'Nhấn lại để xác nhận xóa'
                                        : 'Xóa'
                                }
                            >
                                <span className="material-symbols-outlined">
                                    {deletingSubjectId === subject.subjectid ? 'check' : 'delete'}
                                </span>
                            </button>
                            </Can>
                        </>
                    ) : (
                        <Can permission="lookup.delete">
                        <button
                            className="admin-ui-button admin-ui-button-secondary subject-inline-action"
                            onClick={() => void handleRestoreSubject(subject.subjectid)}
                            type="button"
                            title="Khôi phục"
                        >
                            <span className="material-symbols-outlined">restore</span>
                        </button>
                        </Can>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <SectionCard
                title="Quản lý môn học"
                subtitle="Quản lý danh mục môn học và phạm vi khối lớp hiển thị trên nền tảng."
                headerAction={
                    <Can permission="lookup.create">
                    <button className="admin-ui-button admin-ui-button-primary" onClick={handleAddSubject}>
                        <span className="material-symbols-outlined">add</span>
                        Thêm môn học
                    </button>
                    </Can>
                }
            >
                <div className="admin-ui-toolbar subjects-admin-toolbar">
                    <FilterTabs
                        tabs={[
                            { key: 'all', label: `Tất cả (${subjects.length})` },
                            { key: 'active', label: `Hoạt động (${activeCount})` },
                            { key: 'inactive', label: `Đã xóa (${inactiveCount})` },
                        ]}
                        activeKey={filterStatus}
                        onChange={(key) => setFilterStatus(key as FilterStatus)}
                    />

                    <div className="admin-ui-search">
                        <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                        <input
                            className="admin-ui-search-input"
                            type="text"
                            placeholder="Tìm kiếm môn học..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={pagedSubjects}
                    rowKey="subjectid"
                    loading={loading}
                    loadingText="Đang tải danh sách môn học..."
                    emptyText={
                        searchQuery.trim()
                            ? 'Không tìm thấy môn học phù hợp'
                            : filterStatus === 'inactive'
                            ? 'Không có môn học nào đã xóa'
                            : 'Chưa có môn học nào'
                    }
                    pagination={{ current: page, pageSize, total, onChange: setPage }}
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={920}
                />
            </SectionCard>

            {isModalOpen && (
                <SubjectModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSuccess={() => void handleModalSuccess()}
                    editingSubject={editingSubject}
                />
            )}
        </>
    );
};

export default SubjectsManagement;
