/**
 * MOCK DATA for AdminVetting Module
 * TODO: Remove this file when backend APIs are ready
 */

import type { TutorForReview, TutorDetailForReview } from '../../types/admin.types';

// ============================================
// MOCK PENDING TUTORS LIST
// ============================================

export const mockPendingTutors: TutorForReview[] = [
  {
    tutorid: 'tutor-001',
    userid: 'user-001',
    fullname: 'Nguyễn Văn An',
    email: 'nguyenvanan@gmail.com',
    phone: '0901234567',
    avatarurl: 'https://i.pravatar.cc/150?img=12',
    profilestatus: 'pending_review',
    subjects: ['Toán học', 'Vật lý'],
    createdat: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    tutorid: 'tutor-002',
    userid: 'user-002',
    fullname: 'Trần Thị Bích',
    email: 'tranthib@gmail.com',
    phone: '0912345678',
    avatarurl: 'https://i.pravatar.cc/150?img=27',
    profilestatus: 'pending_review',
    subjects: ['Tiếng Anh', 'IELTS'],
    createdat: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  },
  {
    tutorid: 'tutor-003',
    userid: 'user-003',
    fullname: 'Lê Hoàng Minh',
    email: 'lehoangminh@edu.vn',
    phone: '0923456789',
    avatarurl: 'https://i.pravatar.cc/150?img=33',
    profilestatus: 'pending_review',
    subjects: ['Hóa học', 'Sinh học'],
    createdat: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    tutorid: 'tutor-004',
    userid: 'user-004',
    fullname: 'Phạm Thu Hương',
    email: 'phamthuhuong@yahoo.com',
    phone: '0934567890',
    avatarurl: 'https://i.pravatar.cc/150?img=44',
    profilestatus: 'pending_review',
    subjects: ['Văn học', 'Lịch sử'],
    createdat: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    tutorid: 'tutor-005',
    userid: 'user-005',
    fullname: 'Đặng Quốc Khánh',
    email: 'dangquockhanh@gmail.com',
    phone: '0945678901',
    avatarurl: 'https://i.pravatar.cc/150?img=52',
    profilestatus: 'pending_review',
    subjects: ['Tin học', 'Lập trình'],
    createdat: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    tutorid: 'tutor-006',
    userid: 'user-006',
    fullname: 'Võ Thị Mai',
    email: 'vothimai@outlook.com',
    phone: '0956789012',
    avatarurl: 'https://i.pravatar.cc/150?img=23',
    profilestatus: 'pending_review',
    subjects: ['Địa lý', 'Kinh tế'],
    createdat: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
  },
];

// ============================================
// MOCK TUTOR DETAIL FOR REVIEW
// ============================================

export const mockTutorDetails: Record<string, TutorDetailForReview> = {
  'tutor-001': {
    user: {
      userid: 'user-001',
      fullname: 'Nguyễn Văn An',
      email: 'nguyenvanan@gmail.com',
      phone: '0901234567',
      birthdate: '1995-03-15',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      gender: 'Nam',
      identitynumber: '079095001234',
      idcardfronturl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=CCCD+Mat+Truoc',
      idcardbackurl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=CCCD+Mat+Sau',
      isidentityverified: false,
      ekycRawData: JSON.stringify({
        id: '079095001234',
        name: 'NGUYEN VAN AN',
        dob: '15/03/1995',
        sex: 'NAM',
        home: 'Hà Nội',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        type_new: 'cccd_chip_front',
        id_prob: '99.32',
      }),
    },
    profile: {
      tutorid: 'tutor-001',
      headline: 'Gia sư Toán - Lý | 5 năm kinh nghiệm | Chuyên luyện thi THPT',
      bio: 'Tôi là sinh viên năm cuối Đại học Bách Khoa TP.HCM, chuyên ngành Cơ Điện Tử. Với 5 năm kinh nghiệm dạy kèm Toán và Vật lý cho học sinh THCS và THPT, tôi đã giúp hơn 50 học sinh cải thiện điểm số và đạt kết quả cao trong kỳ thi THPT Quốc gia.\n\nPhương pháp giảng dạy của tôi:\n- Đánh giá năng lực học sinh và xây dựng lộ trình học tập cá nhân hóa\n- Giảng bài dễ hiểu, từ cơ bản đến nâng cao\n- Nhiều bài tập thực hành và đề thi thử\n- Hỗ trợ học sinh 24/7 qua Zalo/Messenger',
      hourlyrate: 200000,
      experience: 5,
      education: 'Đại học Bách Khoa TP.HCM',
      gpa: '3.65',
      timezone: 'Asia/Ho_Chi_Minh',
      teachingareacity: 'TP. Hồ Chí Minh',
      teachingareadistrict: 'Quận 1, Quận 3, Quận 5',
      teachingmode: 'both',
      profilestatus: 'pending_review',
      verificationstatus: 'pending',
      certificateurl: [
        {
          name: 'Bằng Đại học Bách Khoa',
          url: 'https://via.placeholder.com/600x400/059669/FFFFFF?text=Bang+Dai+Hoc',
          type: 'degree',
          issuer: 'ĐH Bách Khoa TP.HCM',
          year: '2020',
          verified: false,
        },
        {
          name: 'Chứng chỉ IELTS 7.5',
          url: 'https://via.placeholder.com/600x400/DC2626/FFFFFF?text=IELTS+Certificate',
          type: 'certificate',
          issuer: 'British Council',
          year: '2023',
          verified: false,
        },
      ],
      videointrourl: null,
      verifiedat: null,
      verifiedby: null,
      rejectionnote: null,
    },
    subjects: [
      {
        subjectid: 'subject-001',
        subjectname: 'Toán học',
        gradelevels: 'Lớp 10, 11, 12',
        specialization: 'Hình học không gian, Giải tích',
      },
      {
        subjectid: 'subject-002',
        subjectname: 'Vật lý',
        gradelevels: 'Lớp 10, 11, 12',
        specialization: 'Cơ học, Điện học',
      },
    ],
    availability: [
      {
        availabilityid: 'avail-001',
        dayofweek: 1, // Monday
        starttime: '18:00',
        endtime: '20:30',
        isavailable: true,
      },
      {
        availabilityid: 'avail-002',
        dayofweek: 3, // Wednesday
        starttime: '18:00',
        endtime: '20:30',
        isavailable: true,
      },
      {
        availabilityid: 'avail-003',
        dayofweek: 5, // Friday
        starttime: '18:00',
        endtime: '20:30',
        isavailable: true,
      },
      {
        availabilityid: 'avail-004',
        dayofweek: 6, // Saturday
        starttime: '08:00',
        endtime: '12:00',
        isavailable: true,
      },
      {
        availabilityid: 'avail-005',
        dayofweek: 0, // Sunday
        starttime: '14:00',
        endtime: '17:00',
        isavailable: true,
      },
    ],
  },

  'tutor-002': {
    user: {
      userid: 'user-002',
      fullname: 'Trần Thị Bích',
      email: 'tranthib@gmail.com',
      phone: '0912345678',
      birthdate: '1993-08-22',
      address: '456 Lê Lợi, Quận 3, TP.HCM',
      gender: 'Nữ',
      identitynumber: '079093002345',
      idcardfronturl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=CCCD+Front',
      idcardbackurl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=CCCD+Back',
      isidentityverified: true,
      ekycRawData: JSON.stringify({
        id: '079093002345',
        name: 'TRAN THI BICH',
        dob: '22/08/1993',
        sex: 'NU',
        home: 'TP. Hồ Chí Minh',
        address: '456 Lê Lợi, Quận 3, TP.HCM',
        type_new: 'cccd_chip_front',
        id_prob: '98.75',
      }),
    },
    profile: {
      tutorid: 'tutor-002',
      headline: 'Native English Speaker | IELTS Instructor | 7 years experience',
      bio: 'Tôi có 7 năm kinh nghiệm giảng dạy tiếng Anh giao tiếp và luyện thi IELTS. Đã giúp hơn 100 học viên đạt band 7.0+ trong kỳ thi IELTS.\n\nChuyên môn:\n- IELTS Speaking & Writing (band 8.0 guarantee)\n- English for Business Communication\n- Pronunciation & Accent Training\n- Cambridge English Exams',
      hourlyrate: 350000,
      experience: 7,
      education: 'Đại học Ngoại ngữ - ĐHQG TP.HCM',
      gpa: '3.8',
      timezone: 'Asia/Ho_Chi_Minh',
      teachingareacity: 'TP. Hồ Chí Minh',
      teachingareadistrict: 'Quận 1, Quận 3, Quận 10',
      teachingmode: 'online',
      profilestatus: 'pending_review',
      verificationstatus: 'verified',
      certificateurl: [
        {
          name: 'TESOL Certificate',
          url: 'https://via.placeholder.com/600x400/059669/FFFFFF?text=TESOL+Certificate',
          type: 'certificate',
          issuer: 'Cambridge Assessment',
          year: '2018',
          verified: true,
        },
        {
          name: 'IELTS 8.5 Certificate',
          url: 'https://via.placeholder.com/600x400/059669/FFFFFF?text=IELTS+8.5',
          type: 'certificate',
          issuer: 'IDP',
          year: '2022',
          verified: true,
        },
      ],
      videointrourl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      verifiedat: null,
      verifiedby: null,
      rejectionnote: null,
    },
    subjects: [
      {
        subjectid: 'subject-003',
        subjectname: 'Tiếng Anh',
        gradelevels: 'Lớp 6-12, Người đi làm',
        specialization: 'IELTS, TOEFL, Business English',
      },
    ],
    availability: [
      {
        availabilityid: 'avail-006',
        dayofweek: 2, // Tuesday
        starttime: '19:00',
        endtime: '21:00',
        isavailable: true,
      },
      {
        availabilityid: 'avail-007',
        dayofweek: 4, // Thursday
        starttime: '19:00',
        endtime: '21:00',
        isavailable: true,
      },
      {
        availabilityid: 'avail-008',
        dayofweek: 6, // Saturday
        starttime: '09:00',
        endtime: '17:00',
        isavailable: true,
      },
    ],
  },

  'tutor-003': {
    user: {
      userid: 'user-003',
      fullname: 'Lê Hoàng Minh',
      email: 'lehoangminh@edu.vn',
      phone: '0923456789',
      birthdate: '1996-11-10',
      address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
      gender: 'Nam',
      identitynumber: '079096003456',
      idcardfronturl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=ID+Front',
      idcardbackurl: 'https://via.placeholder.com/400x250/4A5568/FFFFFF?text=ID+Back',
      isidentityverified: false,
      ekycRawData: null,
    },
    profile: {
      tutorid: 'tutor-003',
      headline: 'Giáo viên Hóa - Sinh | Chuyên luyện thi Đại học',
      bio: 'Giáo viên chuyên môn Hóa học và Sinh học với 4 năm kinh nghiệm giảng dạy tại trung tâm luyện thi.\n\nThành tích:\n- 95% học sinh đỗ Đại học\n- Nhiều học sinh điểm 9-10 môn Hóa, Sinh\n- Phương pháp giảng dạy tư duy, không học vẹt',
      hourlyrate: 180000,
      experience: 4,
      education: 'Đại học Khoa học Tự nhiên TP.HCM',
      gpa: '3.45',
      timezone: 'Asia/Ho_Chi_Minh',
      teachingareacity: 'TP. Hồ Chí Minh',
      teachingareadistrict: 'Quận 5, Quận 6, Quận 8',
      teachingmode: 'offline',
      profilestatus: 'pending_review',
      verificationstatus: 'pending',
      certificateurl: [
        {
          name: 'Bằng Cử nhân Hóa học',
          url: 'https://via.placeholder.com/600x400/059669/FFFFFF?text=Chemistry+Degree',
          type: 'degree',
          issuer: 'ĐH Khoa học Tự nhiên',
          year: '2019',
          verified: false,
        },
      ],
      videointrourl: null,
      verifiedat: null,
      verifiedby: null,
      rejectionnote: null,
    },
    subjects: [
      {
        subjectid: 'subject-004',
        subjectname: 'Hóa học',
        gradelevels: 'Lớp 10, 11, 12',
        specialization: 'Hóa hữu cơ, Hóa vô cơ',
      },
      {
        subjectid: 'subject-005',
        subjectname: 'Sinh học',
        gradelevels: 'Lớp 10, 11, 12',
        specialization: 'Di truyền học, Sinh thái',
      },
    ],
    availability: [
      {
        availabilityid: 'avail-009',
        dayofweek: 1,
        starttime: '17:00',
        endtime: '19:00',
        isavailable: true,
      },
      {
        availabilityid: 'avail-010',
        dayofweek: 3,
        starttime: '17:00',
        endtime: '19:00',
        isavailable: true,
      },
      {
        availabilityid: 'avail-011',
        dayofweek: 5,
        starttime: '17:00',
        endtime: '19:00',
        isavailable: true,
      },
    ],
  },
};

// ============================================
// MOCK API FUNCTIONS
// ============================================

/**
 * Mock API: Get pending tutors
 * Simulates 500ms network delay
 */
export const mockGetPendingTutors = async (): Promise<TutorForReview[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockPendingTutors;
};

/**
 * Mock API: Get tutor detail for review
 * Simulates 800ms network delay
 */
export const mockGetTutorDetailForReview = async (
  tutorId: string
): Promise<TutorDetailForReview> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const detail = mockTutorDetails[tutorId];
  if (!detail) {
    throw new Error(`Tutor detail not found for ID: ${tutorId}`);
  }

  return detail;
};

/**
 * Mock API: Approve tutor
 * Simulates 1000ms network delay
 */
export const mockApproveTutor = async (tutorId: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`✅ Mock: Approved tutor ${tutorId}`);
};

/**
 * Mock API: Reject tutor
 * Simulates 1000ms network delay
 */
export const mockRejectTutor = async (
  tutorId: string,
  rejectionNote: string
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`❌ Mock: Rejected tutor ${tutorId} with note: ${rejectionNote}`);
};
