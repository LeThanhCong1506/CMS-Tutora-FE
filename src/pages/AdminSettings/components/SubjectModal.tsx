import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'react-toastify';
import type { Subject, SubjectFormData } from '../mockData';
import { getAllGradeLevels, mockCreateSubject, mockUpdateSubject } from '../mockData';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingSubject: Subject | null;
}

const getInitialFormData = (editingSubject: Subject | null): SubjectFormData => {
    if (!editingSubject) {
        return {
            subjectname: '',
            gradelevels: [],
            description: '',
        };
    }

    return {
        subjectname: editingSubject.subjectname,
        gradelevels: [...editingSubject.gradelevels],
        description: editingSubject.description || '',
    };
};

const SubjectModal = ({ isOpen, onClose, onSuccess, editingSubject }: SubjectModalProps) => {
    const [formData, setFormData] = useState<SubjectFormData>(() => getInitialFormData(editingSubject));
    const [errors, setErrors] = useState<Partial<Record<keyof SubjectFormData, string>>>({});
    const [submitting, setSubmitting] = useState(false);

    const allGradeLevels = getAllGradeLevels();
    const isEditMode = !!editingSubject;

    const validateForm = (): boolean => {
        const nextErrors: Partial<Record<keyof SubjectFormData, string>> = {};

        if (!formData.subjectname.trim()) {
            nextErrors.subjectname = 'Tên môn học không được để trống';
        } else if (formData.subjectname.trim().length < 2) {
            nextErrors.subjectname = 'Tên môn học phải có ít nhất 2 ký tự';
        } else if (formData.subjectname.trim().length > 100) {
            nextErrors.subjectname = 'Tên môn học không được vượt quá 100 ký tự';
        }

        if (formData.gradelevels.length === 0) {
            nextErrors.gradelevels = 'Phải chọn ít nhất một khối lớp';
        }

        if (formData.description.trim().length > 500) {
            nextErrors.description = 'Mô tả không được vượt quá 500 ký tự';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleInputChange = (field: keyof SubjectFormData, value: string) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
        if (errors[field]) {
            setErrors((previous) => ({ ...previous, [field]: undefined }));
        }
    };

    const handleGradeLevelToggle = (grade: number) => {
        setFormData((previous) => {
            const gradelevels = previous.gradelevels.includes(grade)
                ? previous.gradelevels.filter((item) => item !== grade)
                : [...previous.gradelevels, grade];

            return { ...previous, gradelevels };
        });

        if (errors.gradelevels) {
            setErrors((previous) => ({ ...previous, gradelevels: undefined }));
        }
    };

    const setGradeLevels = (gradelevels: number[]) => {
        setFormData((previous) => ({ ...previous, gradelevels }));
        if (errors.gradelevels) {
            setErrors((previous) => ({ ...previous, gradelevels: undefined }));
        }
    };

    const handleSelectAllGrades = () => {
        setGradeLevels(formData.gradelevels.length === allGradeLevels.length ? [] : [...allGradeLevels]);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        try {
            setSubmitting(true);

            if (isEditMode && editingSubject) {
                await mockUpdateSubject(editingSubject.subjectid, formData);
                toast.success('Cập nhật môn học thành công');
            } else {
                await mockCreateSubject(formData);
                toast.success('Thêm môn học mới thành công');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving subject:', error);
            toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="subject-modal-overlay" onClick={handleClose}>
            <div className="subject-modal-container" onClick={(event) => event.stopPropagation()}>
                <div className="subject-modal-header">
                    <h2 className="subject-modal-title">
                        <span className="material-symbols-outlined">{isEditMode ? 'edit' : 'add'}</span>
                        {isEditMode ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                    </h2>
                    <button
                        className="subject-modal-close-btn"
                        onClick={handleClose}
                        disabled={submitting}
                        type="button"
                        aria-label="Đóng"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="subject-modal-body" onSubmit={handleSubmit}>
                    <div className="subject-form-group">
                        <label className="subject-form-label" htmlFor="subjectname">
                            Tên môn học <span className="required">*</span>
                        </label>
                        <input
                            id="subjectname"
                            type="text"
                            className={`subject-form-input ${errors.subjectname ? 'error' : ''}`}
                            placeholder="Ví dụ: Toán học, Tiếng Anh, Lập trình Python..."
                            value={formData.subjectname}
                            onChange={(event) => handleInputChange('subjectname', event.target.value)}
                            disabled={submitting}
                            maxLength={100}
                        />
                        {errors.subjectname && <p className="subject-form-error">{errors.subjectname}</p>}
                    </div>

                    <div className="subject-form-group">
                        <label className="subject-form-label">
                            Khối lớp <span className="required">*</span>
                        </label>
                        <div className="subject-grade-quick-actions">
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary subject-grade-quick-btn"
                                onClick={handleSelectAllGrades}
                                disabled={submitting}
                            >
                                {formData.gradelevels.length === allGradeLevels.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary subject-grade-quick-btn"
                                onClick={() => setGradeLevels([1, 2, 3, 4, 5])}
                                disabled={submitting}
                            >
                                Tiểu học (1-5)
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary subject-grade-quick-btn"
                                onClick={() => setGradeLevels([6, 7, 8, 9])}
                                disabled={submitting}
                            >
                                THCS (6-9)
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary subject-grade-quick-btn"
                                onClick={() => setGradeLevels([10, 11, 12])}
                                disabled={submitting}
                            >
                                THPT (10-12)
                            </button>
                        </div>
                        <div className={`subject-grade-grid ${errors.gradelevels ? 'error' : ''}`}>
                            {allGradeLevels.map((grade) => (
                                <label key={grade} className="subject-grade-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formData.gradelevels.includes(grade)}
                                        onChange={() => handleGradeLevelToggle(grade)}
                                        disabled={submitting}
                                    />
                                    <span className="subject-grade-label">Lớp {grade}</span>
                                </label>
                            ))}
                        </div>
                        {errors.gradelevels && <p className="subject-form-error">{errors.gradelevels}</p>}
                        <p className="subject-form-hint">
                            Đã chọn: {formData.gradelevels.length} / {allGradeLevels.length} khối lớp
                        </p>
                    </div>

                    <div className="subject-form-group">
                        <label className="subject-form-label" htmlFor="description">
                            Mô tả (không bắt buộc)
                        </label>
                        <textarea
                            id="description"
                            className={`subject-form-textarea ${errors.description ? 'error' : ''}`}
                            placeholder="Mô tả ngắn về môn học này..."
                            value={formData.description}
                            onChange={(event) => handleInputChange('description', event.target.value)}
                            disabled={submitting}
                            maxLength={500}
                            rows={4}
                        />
                        {errors.description && <p className="subject-form-error">{errors.description}</p>}
                        <p className="subject-form-hint">{formData.description.length} / 500 ký tự</p>
                    </div>

                    <div className="subject-modal-footer">
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="admin-ui-button admin-ui-button-primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="subject-btn-spinner"></span>
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">{isEditMode ? 'check' : 'add'}</span>
                                    {isEditMode ? 'Cập nhật' : 'Thêm môn học'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubjectModal;
