// Mock data for Admin Settings - Subjects Management

export interface Subject {
    subjectid: string;
    subjectname: string;
    gradelevels: number[];
    description: string | null;
    isactive: boolean;
    createdat: string;
    updatedat: string;
}

export interface SubjectFormData {
    subjectname: string;
    gradelevels: number[];
    description: string;
}

// Mock subjects data
let mockSubjects: Subject[] = [
    {
        subjectid: 'subj-001',
        subjectname: 'Toán học',
        gradelevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: 'Toán học từ tiểu học đến trung học phổ thông',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-002',
        subjectname: 'Ngữ văn',
        gradelevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Việt và văn học từ tiểu học đến THPT',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-003',
        subjectname: 'Tiếng Anh',
        gradelevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Anh giao tiếp và học thuật các cấp',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-004',
        subjectname: 'Vật lý',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Vật lý cơ bản và nâng cao THCS, THPT',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-005',
        subjectname: 'Hóa học',
        gradelevels: [8, 9, 10, 11, 12],
        description: 'Hóa học vô cơ, hữu cơ THCS và THPT',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-006',
        subjectname: 'Sinh học',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Sinh học cơ bản và nâng cao',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-007',
        subjectname: 'Lịch sử',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Lịch sử Việt Nam và thế giới',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-008',
        subjectname: 'Địa lý',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Địa lý tự nhiên và kinh tế',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-009',
        subjectname: 'Tiếng Trung',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Trung cơ bản và giao tiếp',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-010',
        subjectname: 'Tiếng Nhật',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Nhật cơ bản, JLPT N5-N1',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-011',
        subjectname: 'Tiếng Hàn',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Hàn cơ bản, TOPIK I-II',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-012',
        subjectname: 'Lập trình Python',
        gradelevels: [9, 10, 11, 12],
        description: 'Lập trình Python cơ bản đến nâng cao',
        isactive: true,
        createdat: '2024-01-20T10:30:00Z',
        updatedat: '2024-01-20T10:30:00Z',
    },
    {
        subjectid: 'subj-013',
        subjectname: 'Lập trình Scratch',
        gradelevels: [3, 4, 5, 6, 7, 8],
        description: 'Lập trình trực quan cho thiếu nhi',
        isactive: true,
        createdat: '2024-01-20T10:30:00Z',
        updatedat: '2024-01-20T10:30:00Z',
    },
    {
        subjectid: 'subj-014',
        subjectname: 'IELTS',
        gradelevels: [10, 11, 12],
        description: 'Luyện thi IELTS (4 kỹ năng)',
        isactive: true,
        createdat: '2024-01-22T14:00:00Z',
        updatedat: '2024-01-22T14:00:00Z',
    },
    {
        subjectid: 'subj-015',
        subjectname: 'TOEFL',
        gradelevels: [10, 11, 12],
        description: 'Luyện thi TOEFL iBT',
        isactive: true,
        createdat: '2024-01-22T14:00:00Z',
        updatedat: '2024-01-22T14:00:00Z',
    },
    {
        subjectid: 'subj-016',
        subjectname: 'SAT',
        gradelevels: [11, 12],
        description: 'Luyện thi SAT (Math, Reading, Writing)',
        isactive: true,
        createdat: '2024-01-22T14:00:00Z',
        updatedat: '2024-01-22T14:00:00Z',
    },
    {
        subjectid: 'subj-017',
        subjectname: 'Âm nhạc',
        gradelevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: 'Piano, Guitar, Thanh nhạc, Lý thuyết',
        isactive: true,
        createdat: '2024-01-25T09:00:00Z',
        updatedat: '2024-01-25T09:00:00Z',
    },
    {
        subjectid: 'subj-018',
        subjectname: 'Mỹ thuật',
        gradelevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: 'Vẽ cơ bản, Màu nước, Sơn dầu, Digital Art',
        isactive: true,
        createdat: '2024-01-25T09:00:00Z',
        updatedat: '2024-01-25T09:00:00Z',
    },
    {
        subjectid: 'subj-019',
        subjectname: 'GDCD',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Giáo dục công dân',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    {
        subjectid: 'subj-020',
        subjectname: 'Công nghệ',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Công nghệ thông tin cơ bản',
        isactive: true,
        createdat: '2024-01-15T08:00:00Z',
        updatedat: '2024-01-15T08:00:00Z',
    },
    // Inactive subjects
    {
        subjectid: 'subj-021',
        subjectname: 'Tiếng Pháp',
        gradelevels: [6, 7, 8, 9, 10, 11, 12],
        description: 'Tiếng Pháp cơ bản (ngừng hoạt động)',
        isactive: false,
        createdat: '2024-01-10T08:00:00Z',
        updatedat: '2024-03-01T15:30:00Z',
    },
    {
        subjectid: 'subj-022',
        subjectname: 'Tiếng Đức',
        gradelevels: [9, 10, 11, 12],
        description: 'Tiếng Đức cơ bản (ngừng hoạt động)',
        isactive: false,
        createdat: '2024-01-10T08:00:00Z',
        updatedat: '2024-03-01T15:30:00Z',
    },
];

// Mock API functions

/**
 * Get all subjects (optionally filter by active status)
 */
export const mockGetSubjects = async (activeOnly: boolean = false): Promise<Subject[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (activeOnly) {
                resolve(mockSubjects.filter((s) => s.isactive));
            } else {
                resolve([...mockSubjects]);
            }
        }, 300);
    });
};

/**
 * Get a single subject by ID
 */
export const mockGetSubjectById = async (subjectId: string): Promise<Subject | null> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const subject = mockSubjects.find((s) => s.subjectid === subjectId);
            resolve(subject || null);
        }, 200);
    });
};

/**
 * Create a new subject
 */
export const mockCreateSubject = async (formData: SubjectFormData): Promise<Subject> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Validate
            if (!formData.subjectname.trim()) {
                reject(new Error('Tên môn học không được để trống'));
                return;
            }
            if (formData.gradelevels.length === 0) {
                reject(new Error('Phải chọn ít nhất một khối lớp'));
                return;
            }

            // Check duplicate
            const exists = mockSubjects.some(
                (s) => s.subjectname.toLowerCase() === formData.subjectname.toLowerCase() && s.isactive
            );
            if (exists) {
                reject(new Error('Môn học này đã tồn tại'));
                return;
            }

            // Create new subject
            const newSubject: Subject = {
                subjectid: `subj-${String(mockSubjects.length + 1).padStart(3, '0')}`,
                subjectname: formData.subjectname.trim(),
                gradelevels: [...formData.gradelevels].sort((a, b) => a - b),
                description: formData.description.trim() || null,
                isactive: true,
                createdat: new Date().toISOString(),
                updatedat: new Date().toISOString(),
            };

            mockSubjects.push(newSubject);
            resolve(newSubject);
        }, 500);
    });
};

/**
 * Update an existing subject
 */
export const mockUpdateSubject = async (
    subjectId: string,
    formData: SubjectFormData
): Promise<Subject> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockSubjects.findIndex((s) => s.subjectid === subjectId);
            if (index === -1) {
                reject(new Error('Không tìm thấy môn học'));
                return;
            }

            // Validate
            if (!formData.subjectname.trim()) {
                reject(new Error('Tên môn học không được để trống'));
                return;
            }
            if (formData.gradelevels.length === 0) {
                reject(new Error('Phải chọn ít nhất một khối lớp'));
                return;
            }

            // Check duplicate (excluding current subject)
            const exists = mockSubjects.some(
                (s) =>
                    s.subjectid !== subjectId &&
                    s.subjectname.toLowerCase() === formData.subjectname.toLowerCase() &&
                    s.isactive
            );
            if (exists) {
                reject(new Error('Tên môn học này đã tồn tại'));
                return;
            }

            // Update subject
            const updatedSubject: Subject = {
                ...mockSubjects[index],
                subjectname: formData.subjectname.trim(),
                gradelevels: [...formData.gradelevels].sort((a, b) => a - b),
                description: formData.description.trim() || null,
                updatedat: new Date().toISOString(),
            };

            mockSubjects[index] = updatedSubject;
            resolve(updatedSubject);
        }, 500);
    });
};

/**
 * Delete a subject (soft delete by setting isactive = false)
 */
export const mockDeleteSubject = async (subjectId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockSubjects.findIndex((s) => s.subjectid === subjectId);
            if (index === -1) {
                reject(new Error('Không tìm thấy môn học'));
                return;
            }

            // Soft delete
            mockSubjects[index] = {
                ...mockSubjects[index],
                isactive: false,
                updatedat: new Date().toISOString(),
            };

            resolve();
        }, 400);
    });
};

/**
 * Restore a deleted subject (set isactive = true)
 */
export const mockRestoreSubject = async (subjectId: string): Promise<Subject> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockSubjects.findIndex((s) => s.subjectid === subjectId);
            if (index === -1) {
                reject(new Error('Không tìm thấy môn học'));
                return;
            }

            // Restore
            const restoredSubject: Subject = {
                ...mockSubjects[index],
                isactive: true,
                updatedat: new Date().toISOString(),
            };

            mockSubjects[index] = restoredSubject;
            resolve(restoredSubject);
        }, 400);
    });
};

/**
 * Get grade level label
 */
export const getGradeLevelLabel = (grade: number): string => {
    if (grade >= 1 && grade <= 5) {
        return `Lớp ${grade}`;
    } else if (grade >= 6 && grade <= 9) {
        return `Lớp ${grade}`;
    } else if (grade >= 10 && grade <= 12) {
        return `Lớp ${grade}`;
    }
    return `Lớp ${grade}`;
};

/**
 * Get all grade levels (1-12)
 */
export const getAllGradeLevels = (): number[] => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
};

/**
 * Format grade levels for display
 */
export const formatGradeLevels = (gradelevels: number[]): string => {
    if (gradelevels.length === 0) return 'Chưa có';
    if (gradelevels.length === 12) return 'Tất cả các lớp (1-12)';

    const sorted = [...gradelevels].sort((a, b) => a - b);

    // Group consecutive grades
    const groups: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
        if (i < sorted.length && sorted[i] === end + 1) {
            end = sorted[i];
        } else {
            if (start === end) {
                groups.push(`Lớp ${start}`);
            } else if (end === start + 1) {
                groups.push(`Lớp ${start}, ${end}`);
            } else {
                groups.push(`Lớp ${start}-${end}`);
            }

            if (i < sorted.length) {
                start = sorted[i];
                end = sorted[i];
            }
        }
    }

    return groups.join(', ');
};
