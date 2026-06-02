import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { Subject } from '../mockData';
import {
    mockGetSubjects,
    mockDeleteSubject,
    mockRestoreSubject,
    formatGradeLevels,
} from '../mockData';
import SubjectModal from './SubjectModal';

type FilterStatus = 'all' | 'active' | 'inactive';

const SubjectsManagement = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    // Delete confirmation state
    const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

    // Load subjects
    useEffect(() => {
        fetchSubjects();
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = [...subjects];

        // Filter by status
        if (filterStatus === 'active') {
            filtered = filtered.filter((s) => s.isactive);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter((s) => !s.isactive);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.subjectname.toLowerCase().includes(query) ||
                    s.description?.toLowerCase().includes(query)
            );
        }

        setFilteredSubjects(filtered);
    }, [subjects, filterStatus, searchQuery]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const data = await mockGetSubjects(false); // Get all subjects including inactive
            setSubjects(data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Không thể tải danh sách môn học');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubject = () => {
        setEditingSubject(null);
        setIsModalOpen(true);
    };

    const handleEditSubject = (subject: Subject) => {
        setEditingSubject(subject);
        setIsModalOpen(true);
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (deletingSubjectId === subjectId) {
            // Confirm delete
            try {
                await mockDeleteSubject(subjectId);
                toast.success('Đã xóa môn học thành công');
                fetchSubjects();
                setDeletingSubjectId(null);
            } catch (error) {
                console.error('Error deleting subject:', error);
                toast.error('Không thể xóa môn học');
            }
        } else {
            // Show confirmation
            setDeletingSubjectId(subjectId);
            setTimeout(() => {
                setDeletingSubjectId(null);
            }, 5000); // Auto-cancel after 5 seconds
        }
    };

    const handleRestoreSubject = async (subjectId: string) => {
        try {
            await mockRestoreSubject(subjectId);
            toast.success('Đã khôi phục môn học');
            fetchSubjects();
        } catch (error) {
            console.error('Error restoring subject:', error);
            toast.error('Không thể khôi phục môn học');
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingSubject(null);
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        setEditingSubject(null);
        fetchSubjects();
    };

    const getStatusBadgeClass = (isActive: boolean) => {
        return isActive ? 'subject-status-badge active' : 'subject-status-badge inactive';
    };

    return (
        <div className="subjects-management">
            {/* Header */}
            <div className="subjects-header">
                <div className="subjects-header-left">
                    <h2 className="subjects-title">
                        <span className="material-symbols-outlined">library_books</span>
                        Quản lý môn học
                    </h2>
                    <p className="subjects-description">
                        Quản lý danh sách các môn học có sẵn trên nền tảng
                    </p>
                </div>
                <button className="subjects-add-btn" onClick={handleAddSubject}>
                    <span className="material-symbols-outlined">add</span>
                    Thêm môn học
                </button>
            </div>

            {/* Filters */}
            <div className="subjects-filters">
                <div className="subjects-filter-tabs">
                    <button
                        className={`subjects-filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        Tất cả
                        <span className="subjects-filter-count">{subjects.length}</span>
                    </button>
                    <button
                        className={`subjects-filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('active')}
                    >
                        Đang hoạt động
                        <span className="subjects-filter-count">
                            {subjects.filter((s) => s.isactive).length}
                        </span>
                    </button>
                    <button
                        className={`subjects-filter-tab ${filterStatus === 'inactive' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('inactive')}
                    >
                        Đã xóa
                        <span className="subjects-filter-count">
                            {subjects.filter((s) => !s.isactive).length}
                        </span>
                    </button>
                </div>

                <div className="subjects-search">
                    <span className="material-symbols-outlined">search</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm môn học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="subjects-table-container">
                {loading ? (
                    <div className="subjects-loading">
                        <div className="subjects-loading-spinner"></div>
                        <p>Đang tải...</p>
                    </div>
                ) : filteredSubjects.length === 0 ? (
                    <div className="subjects-empty">
                        <span className="material-symbols-outlined">inbox</span>
                        <p>
                            {searchQuery.trim()
                                ? 'Không tìm thấy môn học phù hợp'
                                : filterStatus === 'inactive'
                                ? 'Không có môn học nào bị xóa'
                                : 'Chưa có môn học nào'}
                        </p>
                    </div>
                ) : (
                    <table className="subjects-table">
                        <thead>
                            <tr>
                                <th>Tên môn học</th>
                                <th>Khối lớp</th>
                                <th>Mô tả</th>
                                <th style={{ textAlign: 'center', width: '120px' }}>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: '120px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubjects.map((subject) => (
                                <tr key={subject.subjectid} className={!subject.isactive ? 'inactive-row' : ''}>
                                    <td>
                                        <div className="subject-name-cell">
                                            <span className="material-symbols-outlined subject-icon">
                                                {subject.subjectname.includes('Toán')
                                                    ? 'calculate'
                                                    : subject.subjectname.includes('Văn') ||
                                                      subject.subjectname.includes('Ngữ')
                                                    ? 'menu_book'
                                                    : subject.subjectname.includes('Tiếng') ||
                                                      subject.subjectname.includes('IELTS') ||
                                                      subject.subjectname.includes('TOEFL') ||
                                                      subject.subjectname.includes('SAT')
                                                    ? 'translate'
                                                    : subject.subjectname.includes('Lý')
                                                    ? 'science'
                                                    : subject.subjectname.includes('Hóa')
                                                    ? 'experiment'
                                                    : subject.subjectname.includes('Sinh')
                                                    ? 'eco'
                                                    : subject.subjectname.includes('Lịch sử')
                                                    ? 'history_edu'
                                                    : subject.subjectname.includes('Địa')
                                                    ? 'public'
                                                    : subject.subjectname.includes('Âm nhạc')
                                                    ? 'music_note'
                                                    : subject.subjectname.includes('Mỹ thuật')
                                                    ? 'palette'
                                                    : subject.subjectname.includes('Lập trình') ||
                                                      subject.subjectname.includes('Scratch') ||
                                                      subject.subjectname.includes('Python')
                                                    ? 'code'
                                                    : 'school'}
                                            </span>
                                            <strong>{subject.subjectname}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="subject-gradelevels">
                                            {formatGradeLevels(subject.gradelevels)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="subject-description-cell">
                                            {subject.description || <em>Chưa có mô tả</em>}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={getStatusBadgeClass(subject.isactive)}>
                                            {subject.isactive ? 'Hoạt động' : 'Đã xóa'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="subject-actions">
                                            {subject.isactive ? (
                                                <>
                                                    <button
                                                        className="subject-action-btn edit"
                                                        onClick={() => handleEditSubject(subject)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button
                                                        className={`subject-action-btn delete ${
                                                            deletingSubjectId === subject.subjectid ? 'confirm' : ''
                                                        }`}
                                                        onClick={() => handleDeleteSubject(subject.subjectid)}
                                                        title={
                                                            deletingSubjectId === subject.subjectid
                                                                ? 'Nhấn lại để xác nhận xóa'
                                                                : 'Xóa'
                                                        }
                                                    >
                                                        <span className="material-symbols-outlined">
                                                            {deletingSubjectId === subject.subjectid
                                                                ? 'check'
                                                                : 'delete'}
                                                        </span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="subject-action-btn restore"
                                                    onClick={() => handleRestoreSubject(subject.subjectid)}
                                                    title="Khôi phục"
                                                >
                                                    <span className="material-symbols-outlined">restore</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Subject Modal */}
            {isModalOpen && (
                <SubjectModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                    editingSubject={editingSubject}
                />
            )}
        </div>
    );
};

export default SubjectsManagement;
