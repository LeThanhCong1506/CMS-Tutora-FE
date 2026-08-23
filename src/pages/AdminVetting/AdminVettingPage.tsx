import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  getPendingTutors,
  updateTutorApproval,
  getPendingProfileUpdateRequests,
  getProfileUpdateRequestDetail,
  reviewProfileUpdateRequest,
} from '../../services/admin.service';
import TutorDetailModal from './components/TutorDetailModal';
import VettingSortSelect from './components/VettingSortSelect';
import { VETTING_SORT_DEFAULT, getVettingSortLabel } from './utils/vettingSort';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { Can, useAccess } from '../../contexts/AccessContext';
import type { PendingTutorFromAPI, ProfileUpdateRequestFromAPI, SubjectGradePriceItem } from '../../types/admin.types';
import { getFallbackAvatar, cssBackgroundUrl } from '../../utils/avatar';
import { matchesSearch } from '../../utils/vietnameseSearch';
import { diffWords } from '../../utils/wordDiff';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useTabParam } from '../../hooks/useTabParam';
import '../../styles/pages/admin-vetting.css';
import { apiErrorMessage } from '../../utils/apiError';

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const DEFAULT_ORDER = VETTING_SORT_DEFAULT;

// Độ dài tối thiểu của lý do từ chối, dùng chung cho cả hai hàng đợi. BE không ràng buộc tối
// thiểu (chỉ chặn trên 500 ký tự) nên con số này thuần là quy ước UI: cả hai loại lý do đều
// được gửi thẳng cho gia sư đọc, nên đòi hỏi giống nhau — trước đây hồ sơ mới bắt 20 ký tự còn
// yêu cầu cập nhật chỉ bắt 10, cùng một ô nhập trên cùng một trang mà hai luật khác nhau.
const REJECTION_NOTE_MIN_LENGTH = 20;

const VETTING_TABS = ['new', 'updates'] as const;
type VettingTab = (typeof VETTING_TABS)[number];

// Các cặp field (cũ/đề xuất) để vẽ diff cho tab "Yêu cầu cập nhật hồ sơ".
// proposed === null nghĩa là tutor không đụng tới field đó ở lần nộp này.
const PROFILE_UPDATE_DIFF_FIELDS: Array<{
  label: string;
  current: keyof ProfileUpdateRequestFromAPI;
  proposed: keyof ProfileUpdateRequestFromAPI;
}> = [
  { label: 'Tiêu đề', current: 'currentHeadline', proposed: 'proposedHeadline' },
  { label: 'Thành phố', current: 'currentTeachingAreaCity', proposed: 'proposedTeachingAreaCity' },
  { label: 'Quận/huyện', current: 'currentTeachingAreaDistrict', proposed: 'proposedTeachingAreaDistrict' },
  { label: 'Giới thiệu (Bio)', current: 'currentBio', proposed: 'proposedBio' },
  { label: 'Học vị', current: 'currentDegree', proposed: 'proposedDegree' },
  { label: 'Học vấn', current: 'currentEducation', proposed: 'proposedEducation' },
  { label: 'Kinh nghiệm', current: 'currentExperience', proposed: 'proposedExperience' },
  { label: 'Video giới thiệu', current: 'currentVideoIntroUrl', proposed: 'proposedVideoIntroUrl' },
];

// Field dùng để phát hiện "Tutor vừa nộp thêm thay đổi mới trong lúc Admin đang xem" — so bản
// đang hiển thị trên màn hình với bản mới nhất lấy lại từ server ngay trước khi Duyệt/Từ chối.
const PROFILE_UPDATE_COMPARE_KEYS: Array<keyof ProfileUpdateRequestFromAPI> = [
  ...PROFILE_UPDATE_DIFF_FIELDS.map((f) => f.proposed),
  'hasProposedSubjectGradePrices',
];

const hasProfileUpdateRequestChanged = (
  known: ProfileUpdateRequestFromAPI,
  fresh: ProfileUpdateRequestFromAPI,
): boolean => PROFILE_UPDATE_COMPARE_KEYS.some((key) => known[key] !== fresh[key]);

// BE gửi lại "proposed" cho MỌI field trong form (kể cả field tutor không đụng tới, giá trị
// trùng "current") nên proposed !== null không có nghĩa là field đó thực sự thay đổi — phải so
// sánh nội dung đã trim mới biết field nào cần hiển thị trong modal duyệt.
const normalizeForDiff = (value: unknown): string => (value == null ? '' : String(value)).trim();

// Hai điều kiện PHẢI cùng đúng mới tính là field thực sự thay đổi:
//  1) proposed !== null — null nghĩa là tutor KHÔNG đụng tới field này ở lần nộp này (tuỳ luồng
//     nộp, có request để null cho field chưa chạm, có request mirror lại y hệt current). Bỏ qua
//     điều kiện này sẽ đọc nhầm "chưa chạm tới" (null) thành "đã xoá hết nội dung" (so với current).
//  2) Nội dung thật (đã trim) khác current — bắt trường hợp proposed mirror lại y hệt current cho
//     field không đổi (BE trả full snapshot ở một số request, không chỉ riêng phần thay đổi).
const getChangedProfileUpdateFields = (request: ProfileUpdateRequestFromAPI) =>
  PROFILE_UPDATE_DIFF_FIELDS.filter(
    (f) =>
      request[f.proposed] != null &&
      normalizeForDiff(request[f.current]) !== normalizeForDiff(request[f.proposed]),
  );

// ── Diff cho "Môn học & Bảng giá" ──────────────────────────────────────────
// Khác các field text ở trên: đây là dữ liệu có cấu trúc (nhiều dòng môn × lớp), nên so sánh
// theo (subjectId, gradeLevelId) thay vì so text. proposedSubjectGradePrices luôn là snapshot
// TOÀN BỘ giá của tutor ở lần nộp này (không chỉ phần họ vừa sửa) — giống cách currentHeadline/
// proposedHeadline mirror nhau ở trên — nên phải so sánh nội dung mới biết lớp nào thực sự đổi.
type GradePriceChangeType = 'added' | 'removed' | 'changed' | 'same';

interface GradePriceChange {
  gradeLevelId: number;
  gradeLevelLabel: string;
  type: GradePriceChangeType;
  current?: SubjectGradePriceItem;
  proposed?: SubjectGradePriceItem;
}

interface SubjectPriceDiffGroup {
  subjectId: number;
  subjectName: string;
  grades: GradePriceChange[];
}

const priceSpecEqual = (a: SubjectGradePriceItem, b: SubjectGradePriceItem): boolean =>
  a.pricePerHour === b.pricePerHour &&
  a.durationMinutesPerSession === b.durationMinutesPerSession &&
  a.sessionsPerWeek === b.sessionsPerWeek;

const getSubjectPriceDiffGroups = (request: ProfileUpdateRequestFromAPI): SubjectPriceDiffGroup[] => {
  const current = request.currentSubjectGradePrices ?? [];
  const proposed = request.proposedSubjectGradePrices ?? [];
  if (proposed.length === 0) return [];

  const subjectIds = Array.from(new Set([...current.map((c) => c.subjectId), ...proposed.map((p) => p.subjectId)]));

  return subjectIds
    .map((subjectId): SubjectPriceDiffGroup => {
      const currentRows = current.filter((c) => c.subjectId === subjectId);
      const proposedRows = proposed.filter((p) => p.subjectId === subjectId);
      const subjectName = proposedRows[0]?.subjectName ?? currentRows[0]?.subjectName ?? `Môn #${subjectId}`;

      const gradeLevelIds = Array.from(
        new Set([...currentRows.map((c) => c.gradeLevelId), ...proposedRows.map((p) => p.gradeLevelId)]),
      ).sort((a, b) => a - b);

      const grades: GradePriceChange[] = gradeLevelIds.map((gradeLevelId) => {
        const cur = currentRows.find((c) => c.gradeLevelId === gradeLevelId);
        const prop = proposedRows.find((p) => p.gradeLevelId === gradeLevelId);
        const gradeLevelLabel = prop?.gradeLevelName ?? cur?.gradeLevelName ?? `Khối #${gradeLevelId}`;
        const type: GradePriceChangeType = !cur
          ? 'added'
          : !prop
            ? 'removed'
            : priceSpecEqual(cur, prop)
              ? 'same'
              : 'changed';

        return { gradeLevelId, gradeLevelLabel, type, current: cur, proposed: prop };
      });

      return { subjectId, subjectName, grades };
    })
    .filter((group) => group.grades.some((g) => g.type !== 'same'));
};

/**
 * Tên các mục THỰC SỰ đổi trong 1 yêu cầu — dùng chung cho cột "Thay đổi" ngoài bảng và cho
 * badge "N thay đổi" trong modal, nên hai chỗ luôn đếm ra cùng một con số.
 *
 * Trước đây cột ngoài bảng chỉ kiểm tra `proposed !== null` nên liệt kê cả những field BE mirror
 * y hệt giá trị cũ: bảng ghi "Tiêu đề, Thành phố, Quận/huyện, Bio, Học vấn, Kinh nghiệm" trong
 * khi mở ra chỉ có 1-2 mục đổi thật — Admin đọc xong tưởng modal hiển thị thiếu.
 */
const getChangedLabels = (request: ProfileUpdateRequestFromAPI): string[] => {
  const labels = getChangedProfileUpdateFields(request).map((f) => f.label);
  if (getSubjectPriceDiffGroups(request).length > 0) labels.push('Môn học & Bảng giá');
  return labels;
};

const formatPricePerHour = (n: number): string => `${n.toLocaleString('vi-VN')}đ/giờ`;

const formatGradePriceTitle = (item?: SubjectGradePriceItem): string | undefined =>
  item
    ? `${formatPricePerHour(item.pricePerHour)} · ${item.durationMinutesPerSession} phút/buổi · ${item.sessionsPerWeek} buổi/tuần`
    : undefined;

type ApiError = {
  response?: { status?: number };
  code?: string;
  message?: string;
};

const getVettingErrorMessage = (error: unknown) => {
  const err = error as ApiError;

  if (err?.response?.status === 401) {
    return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (err?.response?.status === 403) {
    return 'Bạn không có quyền truy cập trang này.';
  }
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
    return 'Yêu cầu quá lâu. Vui lòng kiểm tra kết nối mạng.';
  }
  if (err?.code === 'ERR_NETWORK') {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.';
  }
  return 'Không thể tải danh sách gia sư. Vui lòng thử lại sau.';
};

const formatSubmittedAt = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Vừa xong';
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

const AdminVettingPage = () => {
  const { can } = useAccess();
  const canViewNew = can('tutor_approval.view');
  const canViewUpdates = can('tutor_profile_update.view');
  const [tutors, setTutors] = useState<PendingTutorFromAPI[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(canViewNew);
  const [error, setError] = useState<string | null>(null);
  // searchInput: live text-box value; searchQuery: committed term sent to BE
  // (only on Enter / button click) so we don't hit the API on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Mặc định "Chờ lâu nhất trước" (FIFO) — hồ sơ chờ lâu nhất nổi lên đầu hàng đợi duyệt.
  const [orderBy, setOrderBy] = useState(DEFAULT_ORDER);
  const [selectedTutor, setSelectedTutor] = useState<PendingTutorFromAPI | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Tab nằm trên URL (?tab=new|updates) — vừa cho deep-link từ thông báo "Yêu cầu cập nhật
  // hồ sơ gia sư" ở NotificationDropdown, vừa giữ đúng tab khi reload.
  // Quyền xem từng tab được clamp lại ở effect bên dưới.
  const [activeTab, setActiveTab] = useTabParam<VettingTab>(VETTING_TABS, canViewNew ? 'new' : 'updates');
  const [updateRequests, setUpdateRequests] = useState<ProfileUpdateRequestFromAPI[]>([]);
  const [updateRequestsLoading, setUpdateRequestsLoading] = useState(canViewUpdates);
  const [updateRequestsError, setUpdateRequestsError] = useState<string | null>(null);
  const [updateActionLoading, setUpdateActionLoading] = useState<string | null>(null);
  // Tab "updates" lọc/sắp xếp/phân trang ở CLIENT, khác tab "new" (BE nhận searchTerm/orderBy/page):
  // endpoint /admin/tutor-profile-update-requests trả nguyên danh sách, không có tham số nào.
  // Trạng thái tách riêng khỏi tab "new" để chuyển qua lại không mất ô tìm kiếm của tab kia.
  const [updateSearchInput, setUpdateSearchInput] = useState('');
  const [updateSearchQuery, setUpdateSearchQuery] = useState('');
  const [updateOrderBy, setUpdateOrderBy] = useState(DEFAULT_ORDER);
  const [updatePage, setUpdatePage] = useState(1);
  const [updateRejectionNote, setUpdateRejectionNote] = useState('');
  const [showUpdateRejectModal, setShowUpdateRejectModal] = useState<string | null>(null);
  const [selectedUpdateRequest, setSelectedUpdateRequest] = useState<ProfileUpdateRequestFromAPI | null>(null);
  // Field nào đang thu gọn trong modal diff — theo label field, reset mỗi lần mở request khác.
  const [collapsedDiffFields, setCollapsedDiffFields] = useState<Set<string>>(new Set());

  const openUpdateRequestModal = (request: ProfileUpdateRequestFromAPI) => {
    setCollapsedDiffFields(new Set());
    setSelectedUpdateRequest(request);
  };

  const toggleDiffFieldCollapsed = (label: string) => {
    setCollapsedDiffFields((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const fetchPendingTutors = useCallback(async () => {
    if (!canViewNew) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPendingTutors(page, PAGE_SIZE, {
        searchTerm: searchQuery || undefined,
        orderBy,
      });
      const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      // If the current page emptied out (e.g. the last row was just
      // approved/rejected), step back so the admin isn't stranded on a
      // blank page beyond the new end of the list.
      if (response.content.length === 0 && page > 1) {
        setPage((prev) => prev - 1);
        return;
      }
      setTutors(response.content);
      setTotal(response.total);
    } catch (err: unknown) {
      console.error('Error fetching pending tutors:', err);
      const apiError = err as ApiError;

      if (apiError?.response?.status === 404) {
        setError(null);
        setTutors([]);
        setTotal(0);
      } else {
        setError(getVettingErrorMessage(err));
        setTutors([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [canViewNew, page, searchQuery, orderBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canViewNew) void fetchPendingTutors();
  }, [canViewNew, fetchPendingTutors]);

  // Keep an open detail modal in sync with refreshed list data: after a
  // per-certificate action, reflect the updated cert statuses, or close the
  // modal if the tutor left the pending queue (profile became Active).
  useEffect(() => {
    if (!selectedTutor) return;
    const fresh = tutors.find((t) => t.userid === selectedTutor.userid) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fresh !== selectedTutor) setSelectedTutor(fresh);
  }, [tutors, selectedTutor]);

  const fetchPendingUpdateRequests = useCallback(async () => {
    if (!canViewUpdates) return;

    try {
      setUpdateRequestsLoading(true);
      setUpdateRequestsError(null);
      const response = await getPendingProfileUpdateRequests();
      setUpdateRequests(response.content || []);
    } catch (err: unknown) {
      console.error('Error fetching pending profile update requests:', err);
      setUpdateRequestsError(getVettingErrorMessage(err));
      setUpdateRequests([]);
    } finally {
      setUpdateRequestsLoading(false);
    }
  }, [canViewUpdates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canViewUpdates) void fetchPendingUpdateRequests();
  }, [canViewUpdates, fetchPendingUpdateRequests]);

  useEffect(() => {
    if (activeTab === 'new' && !canViewNew && canViewUpdates) {
      setActiveTab('updates');
    } else if (activeTab === 'updates' && !canViewUpdates && canViewNew) {
      setActiveTab('new');
    }
  }, [activeTab, canViewNew, canViewUpdates, setActiveTab]);

  /**
   * Gọi lại API lấy bản MỚI NHẤT của request trước khi thực sự Duyệt/Từ chối, vì danh sách
   * không tự cập nhật real-time — nếu Tutor vừa nộp thêm thay đổi trong lúc Admin đang xem,
   * ta phải phát hiện ra và đồng bộ lại UI thay vì để Admin duyệt nhầm nội dung chưa từng thấy.
   */
  const verifyProfileUpdateRequestFreshness = async (
    tutorId: string,
  ): Promise<
    | { status: 'gone'; request: null }
    | { status: 'fresh' | 'stale'; request: ProfileUpdateRequestFromAPI }
  > => {
    const fresh = await getProfileUpdateRequestDetail(tutorId);
    if (!fresh) return { status: 'gone', request: null };

    const known = updateRequests.find((r) => r.tutorId === tutorId);
    const changed = known ? hasProfileUpdateRequestChanged(known, fresh) : false;

    // Đồng bộ lại UI với bản mới nhất trong mọi trường hợp (kể cả khi không đổi, để chắc
    // chắn dữ liệu hiển thị luôn khớp với server tại thời điểm vừa kiểm tra).
    setUpdateRequests((prev) => prev.map((r) => (r.tutorId === tutorId ? fresh : r)));
    setSelectedUpdateRequest((prev) => (prev && prev.tutorId === tutorId ? fresh : prev));

    // Trả kèm bản mới để phía gọi mở lại modal diff đúng nội dung vừa lấy về — luồng Từ chối
    // đã đóng modal diff trước đó nên không còn gì để setSelectedUpdateRequest ở trên bám vào.
    return { status: changed ? 'stale' : 'fresh', request: fresh };
  };

  const handleApproveUpdateRequest = async (tutorId: string) => {
    try {
      setUpdateActionLoading(tutorId);

      const freshness = await verifyProfileUpdateRequestFreshness(tutorId);
      if (freshness.status === 'gone') {
        toast.info('Yêu cầu này không còn tồn tại — có thể đã được xử lý trước đó. Danh sách đang được làm mới.');
        setSelectedUpdateRequest(null);
        await fetchPendingUpdateRequests();
        return;
      }
      if (freshness.status === 'stale') {
        toast.warning('Tutor vừa nộp thêm thay đổi mới trong lúc bạn xem. Vui lòng xem lại nội dung mới rồi bấm Duyệt lại.');
        return;
      }

      const response = await reviewProfileUpdateRequest(tutorId, true);
      // BE có thể chèn thêm cảnh báo vào message (VD: tutor vừa nộp thêm thay đổi mới
      // ngay trong khoảng giữa lúc verifyProfileUpdateRequestFreshness và lúc PUT này chạy)
      // — luôn ưu tiên hiển thị message thật từ server thay vì text tĩnh.
      toast.success(response?.message || 'Duyệt cập nhật hồ sơ thành công. Marketplace đã hiển thị thông tin mới.');
      setSelectedUpdateRequest(null);
      await fetchPendingUpdateRequests();
      // Đồng bộ với badge "Hồ sơ gia sư" ở sidebar — xem comment ở handleApprove bên dưới.
      window.dispatchEvent(new Event('tutora:admin-badge-refresh'));
    } catch (err) {
      console.error('Error approving profile update request:', err);
      toast.error(apiErrorMessage(err, 'Không thể duyệt yêu cầu. Vui lòng thử lại.'));
    } finally {
      setUpdateActionLoading(null);
    }
  };

  // Đóng modal diff trước khi mở modal nhập lý do — hai overlay chồng nhau sẽ che mất ô nhập.
  // Cùng cách TutorDetailModal gọi onOpenReject() rồi onClose() ở tab "new".
  const handleOpenUpdateRejectModal = (tutorId: string) => {
    setSelectedUpdateRequest(null);
    setShowUpdateRejectModal(tutorId);
    setUpdateRejectionNote('');
  };

  const handleRejectUpdateRequest = async () => {
    if (!showUpdateRejectModal) return;
    if (updateRejectionNote.trim().length < REJECTION_NOTE_MIN_LENGTH) {
      toast.error(`Lý do từ chối phải có ít nhất ${REJECTION_NOTE_MIN_LENGTH} ký tự.`);
      return;
    }

    const tutorId = showUpdateRejectModal;

    try {
      setUpdateActionLoading(tutorId);

      const freshness = await verifyProfileUpdateRequestFreshness(tutorId);
      if (freshness.status === 'gone') {
        toast.info('Yêu cầu này không còn tồn tại — có thể đã được xử lý trước đó. Danh sách đang được làm mới.');
        setShowUpdateRejectModal(null);
        setUpdateRejectionNote('');
        await fetchPendingUpdateRequests();
        return;
      }
      if (freshness.status === 'stale') {
        toast.warning('Tutor vừa nộp thêm thay đổi mới trong lúc bạn xem. Vui lòng xem lại nội dung mới rồi từ chối lại nếu cần.');
        setShowUpdateRejectModal(null);
        setUpdateRejectionNote('');
        // Mở lại diff với nội dung mới thay vì bắt Admin tự tìm lại dòng đó trong danh sách.
        openUpdateRequestModal(freshness.request);
        return;
      }

      const response = await reviewProfileUpdateRequest(tutorId, false, updateRejectionNote);
      toast.success(response?.message || 'Đã từ chối yêu cầu cập nhật hồ sơ.');
      setShowUpdateRejectModal(null);
      setUpdateRejectionNote('');
      await fetchPendingUpdateRequests();
      window.dispatchEvent(new Event('tutora:admin-badge-refresh'));
    } catch (err) {
      console.error('Error rejecting profile update request:', err);
      toast.error(apiErrorMessage(err, 'Không thể từ chối yêu cầu. Vui lòng thử lại.'));
    } finally {
      setUpdateActionLoading(null);
    }
  };

  // Commit the live input as the search term (Enter or the search button).
  const commitSearch = () => {
    const next = searchInput.trim();
    if (next !== searchQuery) setSearchQuery(next);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSearch();
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // Bộ ba tương ứng cho tab "updates". Giữ cùng nhịp "gõ xong mới tìm" như tab "new" (Enter hoặc
  // bấm nút) dù ở đây lọc tại client và lọc ngay theo từng ký tự cũng được — hai tab cạnh nhau mà
  // một bên lọc tức thì, một bên phải bấm nút thì thao tác tay quen ở tab này sẽ hụt ở tab kia.
  const commitUpdateSearch = () => {
    const next = updateSearchInput.trim();
    if (next !== updateSearchQuery) setUpdateSearchQuery(next);
    setUpdatePage(1);
  };

  const handleUpdateSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitUpdateSearch();
    }
  };

  const clearUpdateSearch = () => {
    setUpdateSearchInput('');
    setUpdateSearchQuery('');
    setUpdatePage(1);
  };

  const handleApprove = async (tutorId: string) => {
    try {
      setActionLoading(tutorId);
      await updateTutorApproval(tutorId, true);
      toast.success('Phê duyệt gia sư thành công!');
      setSelectedTutor(null);
      await fetchPendingTutors();
      // AdminLayout chỉ fetch số badge "Hồ sơ gia sư" ở sidebar 1 lần lúc mount — báo nó cập nhật
      // lại ngay, không để badge đứng yên tới khi Admin rời trang rồi quay lại.
      window.dispatchEvent(new Event('tutora:admin-badge-refresh'));
    } catch (err) {
      console.error('Error approving tutor:', err);
      toast.error(apiErrorMessage(err, 'Không thể phê duyệt gia sư. Vui lòng thử lại.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectModal = (tutorId: string) => {
    setShowRejectModal(tutorId);
    setRejectionNote('');
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    if (rejectionNote.trim().length < REJECTION_NOTE_MIN_LENGTH) {
      toast.error(`Lý do từ chối phải có ít nhất ${REJECTION_NOTE_MIN_LENGTH} ký tự.`);
      return;
    }

    try {
      setActionLoading(showRejectModal);
      await updateTutorApproval(showRejectModal, false, rejectionNote);
      toast.success('Đã từ chối hồ sơ gia sư.');
      setShowRejectModal(null);
      setRejectionNote('');
      setSelectedTutor(null);
      await fetchPendingTutors();
      window.dispatchEvent(new Event('tutora:admin-badge-refresh'));
    } catch (err) {
      console.error('Error rejecting tutor:', err);
      toast.error(apiErrorMessage(err, 'Không thể từ chối hồ sơ. Vui lòng thử lại.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Some environments return the full queue without X-Pagination. Paginate
  // that response locally while preserving server-side page slices.
  const visibleTutors =
    total > PAGE_SIZE && total === tutors.length ? tutors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : tutors;

  // Tìm theo tên/email gia sư, bỏ dấu (matchesSearch) để gõ "duong thanh phat" vẫn ra "Dương
  // Thành Phát". Sắp xếp theo submittedAt, dùng chung 2 lựa chọn với tab "new" nên nhãn "Chờ lâu
  // nhất trước" ở hai tab nghĩa như nhau.
  const filteredUpdateRequests = useMemo(() => {
    const matched = updateRequests.filter((req) =>
      matchesSearch(updateSearchQuery, req.tutorFullName, req.tutorEmail),
    );
    const direction = updateOrderBy === DEFAULT_ORDER ? 1 : -1;
    return [...matched].sort(
      (a, b) => direction * (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()),
    );
  }, [updateRequests, updateSearchQuery, updateOrderBy]);

  const updateTotal = filteredUpdateRequests.length;

  // Duyệt/từ chối dòng cuối của trang cuối làm danh sách ngắn lại — kéo Admin về trang còn dữ
  // liệu thay vì để đứng nhìn trang trống (tab "new" xử lý việc này ngay trong fetchPendingTutors).
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(updateTotal / PAGE_SIZE));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (updatePage > lastPage) setUpdatePage(lastPage);
  }, [updateTotal, updatePage]);

  const visibleUpdateRequests = filteredUpdateRequests.slice(
    (updatePage - 1) * PAGE_SIZE,
    updatePage * PAGE_SIZE,
  );

  const vettingColumns: DataTableColumn<PendingTutorFromAPI>[] = [
    {
      key: 'tutor',
      title: 'Gia sư',
      minWidth: 220,
      render: (tutor) => (
        <div className="vetting-tutor-info">
          <div
            className="vetting-tutor-avatar"
            style={{ backgroundImage: cssBackgroundUrl(tutor.avatarurl || getFallbackAvatar(tutor.fullname)) }}
          />
          <div className="vetting-profile-cell">
            <span className="vetting-profile-name">{tutor.fullname}</span>
            <span className="vetting-profile-email">{tutor.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'headline',
      title: 'Hồ sơ',
      minWidth: 190,
      render: (tutor) => (
        <div className="vetting-profile-cell">
          <span className="vetting-profile-name vetting-headline-text">
            {tutor.sections?.basicInfo?.headline || 'Chưa cập nhật'}
          </span>
          <span className="vetting-profile-email">{tutor.phone || 'Chưa có số điện thoại'}</span>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'date',
      title: 'Đã nộp',
      render: (tutor) => <span className="vetting-submitted-at">{formatSubmittedAt(tutor.profileCreatedAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: () => <StatusBadge variant="warning">Chờ xem xét</StatusBadge>,
    },
    {
      key: 'actions',
      title: 'Hành động',
      align: 'right',
      render: (tutor) => (
        <div className="certificate-row-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedTutor(tutor);
            }}
            aria-label={`Xem chi tiết hồ sơ của ${tutor.fullname}`}
          >
            <span className="material-symbols-outlined">visibility</span>
            Chi tiết
          </button>
        </div>
      ),
      minWidth: 140,
    },
  ];

  const updateRequestColumns: DataTableColumn<ProfileUpdateRequestFromAPI>[] = [
    {
      key: 'tutor',
      title: 'Gia sư',
      minWidth: 220,
      render: (req) => (
        <div className="vetting-tutor-info">
          <div
            className="vetting-tutor-avatar"
            style={{ backgroundImage: cssBackgroundUrl(req.tutorAvatarUrl || getFallbackAvatar(req.tutorFullName)) }}
          />
          <div className="vetting-profile-cell">
            <span className="vetting-profile-name">{req.tutorFullName || 'Chưa rõ tên'}</span>
            <span className="vetting-profile-email">{req.tutorEmail}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'changes',
      title: 'Thay đổi',
      minWidth: 190,
      render: (req) => {
        const changedLabels = getChangedLabels(req);
        return (
          <span className="admin-ui-entity-secondary">
            {changedLabels.length > 0 ? changedLabels.join(', ') : 'Không có thay đổi nào được ghi nhận'}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'date',
      title: 'Đã nộp',
      render: (req) => <span className="vetting-submitted-at">{formatSubmittedAt(req.submittedAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: () => <StatusBadge variant="warning">Chờ xem xét</StatusBadge>,
    },
    {
      key: 'actions',
      title: 'Hành động',
      align: 'right',
      // Duyệt/Từ chối nằm trong modal chứ không phải ngoài bảng — giống hệt tab "new". Ngoài
      // việc cho 2 tab cùng hình dạng, đây còn là điều kiện để cơ chế chống-duyệt-nhầm hoạt
      // động: verifyProfileUpdateRequestFreshness() cảnh báo "tutor vừa nộp thêm thay đổi" rồi
      // vẽ lại nội dung mới, mà cảnh báo đó vô nghĩa nếu Admin bấm Duyệt từ ngoài danh sách,
      // chưa từng mở diff ra xem.
      render: (req) => (
        <div className="certificate-row-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={(event) => {
              event.stopPropagation();
              openUpdateRequestModal(req);
            }}
            aria-label={`Xem chi tiết yêu cầu cập nhật của ${req.tutorFullName || 'gia sư'}`}
          >
            <span className="material-symbols-outlined">visibility</span>
            Chi tiết
          </button>
        </div>
      ),
      minWidth: 140,
    },
  ];

  return (
    <>
      <div className="certificate-vetting-page">
        <PageContainer
          eyebrow="Kiểm duyệt"
          eyebrowInfo="Theo dõi và xét duyệt hồ sơ gia sư mới cùng các yêu cầu cập nhật hồ sơ."
          title="Hồ sơ gia sư"
          maxWidth="wide"
        >
          <div className="admin-ui-actions vetting-tab-row">
            {canViewNew && (
              <button
                type="button"
                className={`admin-ui-button ${activeTab === 'new' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                onClick={() => setActiveTab('new')}
              >
                Hồ sơ mới ({total})
              </button>
            )}
            {canViewUpdates && (
              <button
                type="button"
                className={`admin-ui-button ${activeTab === 'updates' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                onClick={() => setActiveTab('updates')}
              >
                Yêu cầu cập nhật hồ sơ ({updateRequests.length})
              </button>
            )}
          </div>

          {activeTab === 'new' && canViewNew && (
            <SectionCard
              footer={`${
                searchQuery
                  ? `Tìm thấy ${total} hồ sơ khớp với "${searchQuery}"`
                  : `Hiển thị ${visibleTutors.length} / ${total} hồ sơ chờ duyệt`
              } · Đang xếp theo "${getVettingSortLabel(orderBy)}"`}
            >
              <div className="certificate-vetting-toolbar">
                <div className="certificate-search-group">
                  <div className="admin-ui-search">
                    <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                    <input
                      id="vetting-search"
                      type="search"
                      className="admin-ui-search-input"
                      placeholder="Tìm theo tên, email, số điện thoại..."
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={commitSearch}
                    disabled={loading}
                  >
                    Tìm kiếm
                  </button>
                  {searchQuery && (
                    <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={clearSearch}>
                      Xóa tìm kiếm
                    </button>
                  )}
                </div>
                <div className="certificate-vetting-toolbar-actions">
                  <VettingSortSelect
                    id="vetting-sort"
                    itemNoun="hồ sơ"
                    value={orderBy}
                    onChange={(value) => {
                      setOrderBy(value);
                      setPage(1);
                    }}
                  />
                  <button
                    type="button"
                    className="vetting-refresh-button"
                    onClick={() => void fetchPendingTutors()}
                    disabled={loading}
                    aria-label="Làm mới danh sách hồ sơ chờ duyệt"
                  >
                    <span className={`material-symbols-outlined ${loading ? 'vetting-spinning' : ''}`}>refresh</span>
                    Làm mới
                  </button>
                </div>
              </div>

              {error && !loading ? (
                <div className="vetting-error-state">
                  <span className="material-symbols-outlined vetting-state-icon">error</span>
                  <p>{error}</p>
                  <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={() => void fetchPendingTutors()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : (
                <DataTable<PendingTutorFromAPI>
                  columns={vettingColumns}
                  data={visibleTutors}
                  rowKey="userid"
                  loading={loading}
                  loadingText="Đang tải danh sách gia sư..."
                  emptyText={searchQuery ? 'Không tìm thấy hồ sơ phù hợp' : 'Không có gia sư nào đang chờ duyệt'}
                  emptyIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                      check_circle
                    </span>
                  }
                  onRowClick={(tutor) => setSelectedTutor(tutor)}
                  tableLabel="Hồ sơ gia sư chờ duyệt"
                  pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total,
                    onChange: setPage,
                  }}
                  minWidth={900}
                  variant="embedded"
                  density="compact"
                  adaptive
                />
              )}
            </SectionCard>
          )}

          {activeTab === 'updates' && canViewUpdates && (
            <SectionCard
              footer={`${
                updateSearchQuery
                  ? `Tìm thấy ${updateTotal} yêu cầu khớp với "${updateSearchQuery}"`
                  : `Hiển thị ${visibleUpdateRequests.length} / ${updateTotal} yêu cầu chờ duyệt`
              } · Đang xếp theo "${getVettingSortLabel(updateOrderBy)}"`}
            >
              <div className="certificate-vetting-toolbar">
                <div className="certificate-search-group">
                  <div className="admin-ui-search">
                    <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                    <input
                      id="vetting-update-search"
                      type="search"
                      className="admin-ui-search-input"
                      placeholder="Tìm theo tên, email gia sư..."
                      value={updateSearchInput}
                      onChange={(event) => setUpdateSearchInput(event.target.value)}
                      onKeyDown={handleUpdateSearchKeyDown}
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={commitUpdateSearch}
                    disabled={updateRequestsLoading}
                  >
                    Tìm kiếm
                  </button>
                  {updateSearchQuery && (
                    <button
                      type="button"
                      className="admin-ui-button admin-ui-button-secondary"
                      onClick={clearUpdateSearch}
                    >
                      Xóa tìm kiếm
                    </button>
                  )}
                </div>
                <div className="certificate-vetting-toolbar-actions">
                  <VettingSortSelect
                    id="vetting-update-sort"
                    itemNoun="yêu cầu cập nhật"
                    value={updateOrderBy}
                    onChange={(value) => {
                      setUpdateOrderBy(value);
                      setUpdatePage(1);
                    }}
                  />
                  <button
                    type="button"
                    className="vetting-refresh-button"
                    onClick={() => void fetchPendingUpdateRequests()}
                    disabled={updateRequestsLoading}
                    aria-label="Làm mới danh sách yêu cầu cập nhật hồ sơ"
                  >
                    <span className={`material-symbols-outlined ${updateRequestsLoading ? 'vetting-spinning' : ''}`}>
                      refresh
                    </span>
                    Làm mới
                  </button>
                </div>
              </div>

              {updateRequestsError && !updateRequestsLoading ? (
                <div className="vetting-error-state">
                  <span className="material-symbols-outlined vetting-state-icon">error</span>
                  <p>{updateRequestsError}</p>
                  <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={() => void fetchPendingUpdateRequests()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : (
                <DataTable<ProfileUpdateRequestFromAPI>
                  columns={updateRequestColumns}
                  data={visibleUpdateRequests}
                  rowKey="tutorId"
                  loading={updateRequestsLoading}
                  loadingText="Đang tải danh sách yêu cầu cập nhật..."
                  emptyText={
                    updateSearchQuery
                      ? 'Không tìm thấy yêu cầu phù hợp'
                      : 'Không có yêu cầu cập nhật hồ sơ nào đang chờ duyệt'
                  }
                  emptyIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                      check_circle
                    </span>
                  }
                  onRowClick={(req) => openUpdateRequestModal(req)}
                  tableLabel="Yêu cầu cập nhật hồ sơ"
                  pagination={{
                    current: updatePage,
                    pageSize: PAGE_SIZE,
                    total: updateTotal,
                    onChange: setUpdatePage,
                  }}
                  minWidth={900}
                  variant="embedded"
                  density="compact"
                  adaptive
                />
              )}
            </SectionCard>
          )}
        </PageContainer>
      </div>

      <TutorDetailModal
        tutor={canViewNew ? selectedTutor : null}
        isOpen={canViewNew && selectedTutor !== null}
        onClose={() => setSelectedTutor(null)}
        onApprove={handleApprove}
        onOpenReject={handleOpenRejectModal}
        actionLoading={actionLoading}
      />

      {canViewNew && showRejectModal && (
        <div className="certificate-modal-overlay" onMouseDown={() => setShowRejectModal(null)}>
          <div
            className="certificate-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-reject-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="certificate-reject-header">
              <div>
                <span className="material-symbols-outlined">report</span>
                <h3 id="profile-reject-title">Từ chối hồ sơ gia sư</h3>
              </div>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setShowRejectModal(null)}
                aria-label="Đóng hộp thoại từ chối"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="certificate-reject-body">
              <p>Vui lòng nhập lý do từ chối hồ sơ. Lý do này sẽ được gửi đến gia sư để họ có thể cải thiện hồ sơ.</p>
              <textarea
                className="vetting-rejection-textarea"
                placeholder={`Nhập lý do từ chối (ít nhất ${REJECTION_NOTE_MIN_LENGTH} ký tự)...`}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={4}
              />
              <p className="vetting-char-count">
                {rejectionNote.length}/{REJECTION_NOTE_MIN_LENGTH} ký tự tối thiểu
              </p>
            </div>
            <div className="certificate-reject-footer">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => setShowRejectModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-ui-button admin-ui-button-danger"
                onClick={handleReject}
                disabled={rejectionNote.trim().length < REJECTION_NOTE_MIN_LENGTH || actionLoading !== null}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canViewUpdates && selectedUpdateRequest && (() => {
        const changedFields = getChangedProfileUpdateFields(selectedUpdateRequest);
        const subjectPriceDiffGroups = getSubjectPriceDiffGroups(selectedUpdateRequest);
        const changeCount = changedFields.length + subjectPriceDiffGroups.length;

        return (
          <div className="vetting-modal-overlay" onClick={() => setSelectedUpdateRequest(null)}>
            <div
              className="vetting-modal profile-diff-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-diff-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vetting-modal-header profile-diff-header">
                <div>
                  <h3 id="profile-diff-title">Thay đổi hồ sơ đề xuất</h3>
                  <p className="profile-diff-header-subtitle">
                    {selectedUpdateRequest.tutorFullName || 'Chưa rõ tên'}
                    <span className="profile-diff-count-badge">
                      {changeCount} thay đổi
                    </span>
                  </p>
                </div>
                <button className="vetting-modal-close" onClick={() => setSelectedUpdateRequest(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="vetting-modal-body profile-diff-body">
                {changedFields.map((f) => {
                  const beforeText = String(selectedUpdateRequest[f.current] ?? '');
                  const afterText = String(selectedUpdateRequest[f.proposed] ?? '');
                  const { before, after } = diffWords(beforeText, afterText);
                  const isCollapsed = collapsedDiffFields.has(f.label);
                  return (
                    <div key={f.label} className="profile-diff-field">
                      <button
                        type="button"
                        className="profile-diff-field-label"
                        onClick={() => toggleDiffFieldCollapsed(f.label)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="profile-diff-field-label-text">
                          <span className="profile-diff-field-dot" aria-hidden="true" />
                          {f.label}
                        </span>
                        <span
                          className={`material-symbols-outlined profile-diff-field-chevron ${
                            isCollapsed ? 'profile-diff-field-chevron-collapsed' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                      <div
                        className={`profile-diff-collapse ${isCollapsed ? 'profile-diff-collapse-closed' : ''}`}
                        aria-hidden={isCollapsed}
                      >
                        <div className="profile-diff-columns">
                          <div className="profile-diff-column profile-diff-column-current">
                            <span className="profile-diff-column-tag profile-diff-tag-current">
                              <span className="material-symbols-outlined">history</span>
                              Hiện tại
                            </span>
                            <div className="profile-diff-text">
                              {before.length ? (
                                before.map((token, idx) => (
                                  <span
                                    key={idx}
                                    className={token.type === 'removed' ? 'profile-diff-removed' : undefined}
                                  >
                                    {token.text}
                                  </span>
                                ))
                              ) : (
                                <span className="profile-diff-empty-value">—</span>
                              )}
                            </div>
                          </div>
                          <div className="profile-diff-column profile-diff-column-proposed">
                            <span className="profile-diff-column-tag profile-diff-tag-proposed">
                              <span className="material-symbols-outlined">edit_note</span>
                              Đề xuất
                            </span>
                            <div className="profile-diff-text">
                              {after.length ? (
                                after.map((token, idx) => (
                                  <span
                                    key={idx}
                                    className={token.type === 'added' ? 'profile-diff-added' : undefined}
                                  >
                                    {token.text}
                                  </span>
                                ))
                              ) : (
                                <span className="profile-diff-empty-value">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {subjectPriceDiffGroups.map((group) => {
                  const fieldKey = `subject_price_${group.subjectId}`;
                  const isCollapsed = collapsedDiffFields.has(fieldKey);
                  const currentGrades = group.grades.filter((g) => g.type !== 'added');
                  const proposedGrades = group.grades.filter((g) => g.type !== 'removed');
                  const gradeChipClass = (type: GradePriceChangeType) =>
                    `profile-diff-grade-chip profile-diff-grade-chip-${type}`;
                  return (
                    <div key={fieldKey} className="profile-diff-field">
                      <button
                        type="button"
                        className="profile-diff-field-label"
                        onClick={() => toggleDiffFieldCollapsed(fieldKey)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="profile-diff-field-label-text">
                          <span className="profile-diff-field-dot" aria-hidden="true" />
                          Môn học &amp; giá — {group.subjectName}
                        </span>
                        <span
                          className={`material-symbols-outlined profile-diff-field-chevron ${
                            isCollapsed ? 'profile-diff-field-chevron-collapsed' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                      <div
                        className={`profile-diff-collapse ${isCollapsed ? 'profile-diff-collapse-closed' : ''}`}
                        aria-hidden={isCollapsed}
                      >
                        <div className="profile-diff-columns">
                          <div className="profile-diff-column profile-diff-column-current">
                            <span className="profile-diff-column-tag profile-diff-tag-current">
                              <span className="material-symbols-outlined">history</span>
                              Hiện tại
                            </span>
                            <div className="profile-diff-grade-list">
                              {currentGrades.length ? (
                                currentGrades.map((g) => (
                                  <span
                                    key={g.gradeLevelId}
                                    className={gradeChipClass(g.type)}
                                    title={formatGradePriceTitle(g.current)}
                                  >
                                    {g.gradeLevelLabel}
                                    {g.current ? ` · ${formatPricePerHour(g.current.pricePerHour)}` : ''}
                                  </span>
                                ))
                              ) : (
                                <span className="profile-diff-empty-value">— (môn mới)</span>
                              )}
                            </div>
                          </div>
                          <div className="profile-diff-column profile-diff-column-proposed">
                            <span className="profile-diff-column-tag profile-diff-tag-proposed">
                              <span className="material-symbols-outlined">edit_note</span>
                              Đề xuất
                            </span>
                            <div className="profile-diff-grade-list">
                              {proposedGrades.length ? (
                                proposedGrades.map((g) => (
                                  <span
                                    key={g.gradeLevelId}
                                    className={gradeChipClass(g.type)}
                                    title={formatGradePriceTitle(g.proposed)}
                                  >
                                    {g.gradeLevelLabel}
                                    {g.proposed ? ` · ${formatPricePerHour(g.proposed.pricePerHour)}` : ''}
                                  </span>
                                ))
                              ) : (
                                <span className="profile-diff-empty-value">— (bỏ hết môn này)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {changeCount === 0 && (
                  <div className="profile-diff-empty-state">
                    <span className="material-symbols-outlined">task_alt</span>
                    <p>Không có thay đổi nào được ghi nhận.</p>
                  </div>
                )}
              </div>
              {/* Cùng bố cục với footer của TutorDetailModal ở tab "new": Đóng bên trái, cặp
                  quyết định bên phải, để thao tác duyệt ở hai hàng đợi nằm đúng một chỗ. */}
              <div className="vetting-modal-footer profile-diff-footer">
                <button
                  type="button"
                  className="admin-ui-button admin-ui-button-secondary"
                  onClick={() => setSelectedUpdateRequest(null)}
                >
                  Đóng
                </button>
                <div>
                  <Can permission="tutor_profile_update.decide">
                    <button
                      type="button"
                      className="admin-ui-button admin-ui-button-danger"
                      onClick={() => handleOpenUpdateRejectModal(selectedUpdateRequest.tutorId)}
                      disabled={updateActionLoading !== null}
                    >
                      Từ chối cập nhật
                    </button>
                    <button
                      type="button"
                      className="admin-ui-button admin-ui-button-success"
                      onClick={() => void handleApproveUpdateRequest(selectedUpdateRequest.tutorId)}
                      disabled={updateActionLoading !== null}
                    >
                      <span className="material-symbols-outlined">check</span>
                      {updateActionLoading ? 'Đang xử lý...' : 'Duyệt cập nhật'}
                    </button>
                  </Can>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cùng khuôn với hộp thoại từ chối hồ sơ mới ở trên (certificate-reject-*): cùng icon,
          cùng bố cục nút, cùng thuộc tính trợ năng. Bản cũ ở đây dùng bộ class vetting-modal-*
          đời trước nên hai hộp thoại cùng việc mà trông khác hẳn nhau. */}
      {canViewUpdates && showUpdateRejectModal && (
        <div className="certificate-modal-overlay" onMouseDown={() => setShowUpdateRejectModal(null)}>
          <div
            className="certificate-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-update-reject-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="certificate-reject-header">
              <div>
                <span className="material-symbols-outlined">report</span>
                <h3 id="profile-update-reject-title">Từ chối cập nhật hồ sơ</h3>
              </div>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setShowUpdateRejectModal(null)}
                aria-label="Đóng hộp thoại từ chối"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="certificate-reject-body">
              <p>
                Vui lòng nhập lý do từ chối. Lý do này sẽ được gửi đến gia sư; hồ sơ hiện tại của họ trên
                Marketplace không bị ảnh hưởng.
              </p>
              <textarea
                className="vetting-rejection-textarea"
                placeholder={`Nhập lý do từ chối (ít nhất ${REJECTION_NOTE_MIN_LENGTH} ký tự)...`}
                value={updateRejectionNote}
                onChange={(e) => setUpdateRejectionNote(e.target.value)}
                rows={4}
              />
              <p className="vetting-char-count">
                {updateRejectionNote.length}/{REJECTION_NOTE_MIN_LENGTH} ký tự tối thiểu
              </p>
            </div>
            <div className="certificate-reject-footer">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => setShowUpdateRejectModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-ui-button admin-ui-button-danger"
                onClick={handleRejectUpdateRequest}
                disabled={
                  updateRejectionNote.trim().length < REJECTION_NOTE_MIN_LENGTH || updateActionLoading !== null
                }
              >
                {updateActionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminVettingPage;
