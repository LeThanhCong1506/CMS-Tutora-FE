import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { Subject, SubjectFormData } from '../mockData';
import { mockCreateSubject, mockUpdateSubject, getAllGradeLevels } from '../mockData';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingSubject: Subject | null;
}

const SubjectModal = ({ isOpen, onClose, onSuccess, editingSubject }: SubjectModalProps) => {
    const [formData, setFormData] = useState<SubjectFormData>({
        subjectname: '',
        gradelevels: [],
        description: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof SubjectFormData, string>>>({});
    const [submitting, setSubmitting] = useState(false);

    const allGradeLevels = getAllGradeLevels();
    const isEditMode = !!editingSubject;

    // Initialize form data
    useEffect(() => {
        if (editingSubject) {
            setFormData({
                subjectname: editingSubject.subjectname,
                gradelevels: [...editingSubject.gradelevels],
                description: editingSubject.description || '',
            });
        } else {
            setFormData({
                subjectname: '',
                gradelevels: [],
                description: '',
            });
        }
        setErrors({});
    }, [editingSubject, isOpen]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof SubjectFormData, string>> = {};

        // Validate subject name
        if (!formData.subjectname.trim()) {
            newErrors.subjectname = 'Tên môn học không được để trống';
        } else if (formData.subjectname.trim().length < 2) {
            newErrors.subjectname = 'Tên môn học phải có ít nhất 2 ký tự';
        } else if (formData.subjectname.trim().length > 100) {
            newErrors.subjectname = 'Tên môn học không được vượt quá 100 ký tự';
        }

        // Validate grade levels
        if (formData.gradelevels.length === 0) {
            newErrors.gradelevels = 'Phải chọn ít nhất một khối lớp';
        }

        // Validate description (optional but limit length)
        if (formData.description.trim().length > 500) {
            newErrors.description = 'Mô tả không được vượt quá 500 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof SubjectFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleGradeLevelToggle = (grade: number) => {
        setFormData((prev) => {
            const newGradeLevels = prev.gradelevels.includes(grade)
                ? prev.gradelevels.filter((g) => g !== grade)
                : [...prev.gradelevels, grade];
            return { ...prev, gradelevels: newGradeLevels };
        });
        // Clear error for gradelevels
        if (errors.gradelevels) {
            setErrors((prev) => ({ ...prev, gradelevels: undefined }));
        }
    };

    const handleSelectAllGrades = () => {
        if (formData.gradelevels.length === allGradeLevels.length) {
            // Deselect all
            setFormData((prev) => ({ ...prev, gradelevels: [] }));
        } else {
            // Select all
            setFormData((prev) => ({ ...prev, gradelevels: [...allGradeLevels] }));
            if (errors.gradelevels) {
                setErrors((prev) => ({ ...prev, gradelevels: undefined }));
            }
        }
    };

    const handleSelectPrimary = () => {
        // Grades 1-5
        const primaryGrades = [1, 2, 3, 4, 5];
        setFormData((prev) => ({ ...prev, gradelevels: primaryGrades }));
        if (errors.gradelevels) {
            setErrors((prev) => ({ ...prev, gradelevels: undefined }));
        }
    };

    const handleSelectMiddle = () => {
        // Grades 6-9
        const middleGrades = [6, 7, 8, 9];
        setFormData((prev) => ({ ...prev, gradelevels: middleGrades }));
        if (errors.gradelevels) {
            setErrors((prev) => ({ ...prev, gradelevels: undefined }));
        }
    };

    const handleSelectHigh = () => {
        // Grades 10-12
        const highGrades = [10, 11, 12];
        setFormData((prev) => ({ ...prev, gradelevels: highGrades }));
        if (errors.gradelevels) {
            setErrors((prev) => ({ ...prev, gradelevels: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
            toast.error(errorMessage);
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
            <div className="subject-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="subject-modal-header">
                    <h2 className="subject-modal-title">
                        <span className="material-symbols-outlined">
                            {isEditMode ? 'edit' : 'add'}
                        </span>
                        {isEditMode ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                    </h2>
                    <button
                        className="subject-modal-close-btn"
                        onClick={handleClose}
                        disabled={submitting}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <form className="subject-modal-body" onSubmit={handleSubmit}>
                    {/* Subject Name */}
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
                            onChange={(e) => handleInputChange('subjectname', e.target.value)}
                            disabled={submitting}
                            maxLength={100}
                        />
                        {errors.subjectname && (
                            <p className="subject-form-error">{errors.subjectname}</p>
                        )}
                    </div>

                    {/* Grade Levels */}
                    <div className="subject-form-group">
                        <label className="subject-form-label">
                            Khối lớp <span className="required">*</span>
                        </label>
                        <div className="subject-grade-quick-actions">
                            <button
                                type="button"
                                className="subject-grade-quick-btn"
                                onClick={handleSelectAllGrades}
                                disabled={submitting}
                            >
                                {formData.gradelevels.length === allGradeLevels.length
                                    ? 'Bỏ chọn tất cả'
                                    : 'Chọn tất cả'}
                            </button>
                            <button
                                type="button"
                                className="subject-grade-quick-btn"
                                onClick={handleSelectPrimary}
                                disabled={submitting}
                            >
                                Tiểu học (1-5)
                            </button>
                            <button
                                type="button"
                                className="subject-grade-quick-btn"
                                onClick={handleSelectMiddle}
                                disabled={submitting}
                            >
                                THCS (6-9)
                            </button>
                            <button
                                type="button"
                                className="subject-grade-quick-btn"
                                onClick={handleSelectHigh}
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
                        {errors.gradelevels && (
                            <p className="subject-form-error">{errors.gradelevels}</p>
                        )}
                        <p className="subject-form-hint">
                            Đã chọn: {formData.gradelevels.length} / {allGradeLevels.length} khối lớp
                        </p>
                    </div>

                    {/* Description */}
                    <div className="subject-form-group">
                        <label className="subject-form-label" htmlFor="description">
                            Mô tả (không bắt buộc)
                        </label>
                        <textarea
                            id="description"
                            className={`subject-form-textarea ${errors.description ? 'error' : ''}`}
                            placeholder="Mô tả ngắn về môn học này..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            disabled={submitting}
                            maxLength={500}
                            rows={4}
                        />
                        {errors.description && (
                            <p className="subject-form-error">{errors.description}</p>
                        )}
                        <p className="subject-form-hint">
                            {formData.description.length} / 500 ký tự
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="subject-modal-footer">
                        <button
                            type="button"
                            className="subject-modal-btn secondary"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="subject-modal-btn primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="subject-btn-spinner"></span>
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">
                                        {isEditMode ? 'check' : 'add'}
                                    </span>
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
