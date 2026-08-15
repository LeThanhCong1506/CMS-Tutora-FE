import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { PageContainer, SectionCard } from '../../components/shared';
import {
  getSupportThreads,
  getSupportThread,
  sendSupportMessage,
  sendSupportImage,
  type SupportThreadSummary,
  type SupportThreadDetail,
  type SupportMessage,
} from '../../services/adminSupport.service';
import { signalRService } from '../../services/signalr.service';
import { apiErrorMessage } from '../../utils/apiError';
import styles from './AdminSupportInboxPage.module.css';

interface SupportMessageBroadcast {
  userId: string;
  supportThreadId: number;
  message: SupportMessage;
}

type RoleFilter = 'all' | 'Tutor' | 'Parent' | 'Student';

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Tutor', label: 'Gia sư' },
  { key: 'Parent', label: 'Phụ huynh' },
  { key: 'Student', label: 'Học sinh' },
];

const ROLE_LABEL: Record<string, string> = {
  Tutor: 'Gia sư',
  Parent: 'Phụ huynh',
  Student: 'Học sinh',
};

const roleClassKey = (role: string | null): 'tutor' | 'parent' | 'student' => {
  if (role === 'Tutor') return 'tutor';
  if (role === 'Parent') return 'parent';
  return 'student';
};

const roleChipClass = (role: string | null) => {
  const key = roleClassKey(role);
  if (key === 'tutor') return styles.roleChipTutor;
  if (key === 'parent') return styles.roleChipParent;
  return styles.roleChipStudent;
};

const avatarClass = (role: string | null) => {
  const key = roleClassKey(role);
  if (key === 'tutor') return styles.avatarTutor;
  if (key === 'parent') return styles.avatarParent;
  return styles.avatarStudent;
};

const initialsOf = (name: string | null) => {
  const parts = (name || '?').trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? '?';
  const first = parts.length > 1 ? parts[0][0] : '';
  return (first + last).toUpperCase();
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatListTime = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (isSameDay(date, yesterday)) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatMsgTime = (iso: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDayDivider = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dateStr = date.toLocaleDateString('vi-VN');
  if (isSameDay(date, now)) return `Hôm nay, ${dateStr}`;
  if (isSameDay(date, yesterday)) return `Hôm qua, ${dateStr}`;
  return dateStr;
};

const QUICK_REPLIES: { label: string; message: string }[] = [
  { label: 'Xác nhận đã nhận yêu cầu', message: 'Dạ em đã ghi nhận yêu cầu của anh/chị, Tutora sẽ kiểm tra và phản hồi sớm nhất ạ.' },
  { label: 'Đã kiểm tra hệ thống', message: 'Dạ em đã kiểm tra hệ thống, buổi học/giao dịch của anh/chị vẫn ghi nhận bình thường ạ.' },
  { label: 'Hướng dẫn xem lại buổi học', message: 'Anh/chị vào mục "Lịch sử buổi học" > chọn buổi cần xem > bấm "Xem lại" để phát video ghi hình ạ.' },
  { label: 'Hướng dẫn rút tiền', message: 'Gia sư cần đạt số dư ví tối thiểu và đủ thời gian giữ tiền trước khi tạo được yêu cầu rút — anh/chị xem chi tiết ở mục Ví của tôi giúp em ạ.' },
  { label: 'Xin thêm thông tin', message: 'Anh/chị vui lòng gửi giúp em ảnh chụp màn hình và thời điểm xảy ra lỗi để em kiểm tra chính xác hơn ạ.' },
  { label: 'Chuyển kỹ thuật xử lý', message: 'Dạ vấn đề này em đã chuyển bộ phận kỹ thuật xử lý, sẽ phản hồi anh/chị trong vòng 24h ạ.' },
  { label: 'Xin lỗi vì sự bất tiện', message: 'Dạ Tutora xin lỗi vì sự bất tiện này ạ, em sẽ hỗ trợ anh/chị xử lý ngay.' },
  { label: 'Đóng yêu cầu hỗ trợ', message: 'Dạ vấn đề đã được xử lý xong ạ. Nếu cần hỗ trợ thêm anh/chị cứ nhắn cho Tutora nhé, em cảm ơn anh/chị!' },
];

export const AdminSupportInboxPage: React.FC = () => {
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [imageSending, setImageSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Handler đăng ký 1 lần lúc mount — dùng ref để luôn đọc được userId đang mở tại thời điểm
  // tin nhắn tới, tránh closure cũ (selectedUserId lúc đăng ký handler đã có thể lỗi thời).
  const selectedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  // API response và SignalR broadcast cùng đại diện cho một SupportMessage. Chúng có
  // thể đến theo thứ tự ngược nhau, nên gộp theo ID trước khi đưa vào thread đang mở.
  const appendDetailMessage = useCallback((message: SupportMessage) => {
    setDetail((prev) => {
      if (!prev || prev.messages.some((item) => item.supportMessageId === message.supportMessageId)) return prev;
      return { ...prev, messages: [...prev.messages, message] };
    });
  }, []);

  const fetchThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const data = await getSupportThreads();
      setThreads(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được danh sách hội thoại.'));
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchThreads();
  }, [fetchThreads]);

  // Real-time: PortalLayout đã mở kết nối SignalR (notification hub) từ trước, ở đây chỉ
  // đăng ký lắng nghe — không tự connect() để tránh mở kết nối thứ 2.
  useEffect(() => {
    const unsubscribe = signalRService.subscribeToSupportMessages((raw: unknown) => {
      const broadcast = raw as SupportMessageBroadcast;
      const isOpenThread = selectedUserIdRef.current === broadcast.userId;

      if (isOpenThread) {
        appendDetailMessage(broadcast.message);
      }

      setThreads((prev) => {
        const rest = prev.filter((t) => t.userId !== broadcast.userId);
        const current = prev.find((t) => t.userId === broadcast.userId);
        const isFromAdmin = broadcast.message.senderSide === 'admin';
        const preview = broadcast.message.messageType === 'image' ? '📷 Hình ảnh' : broadcast.message.message;
        const updated: SupportThreadSummary = current
          ? {
              ...current,
              lastMessage: preview,
              lastMessageAt: broadcast.message.createdAt,
              lastMessageFromAdmin: isFromAdmin,
              unreadCount: isFromAdmin || isOpenThread ? current.unreadCount : current.unreadCount + 1,
            }
          : {
              supportThreadId: broadcast.supportThreadId,
              userId: broadcast.userId,
              userName: null,
              userAvatarUrl: null,
              userRole: null,
              lastMessage: preview,
              lastMessageAt: broadcast.message.createdAt,
              lastMessageFromAdmin: isFromAdmin,
              unreadCount: isFromAdmin ? 0 : 1,
            };
        return [updated, ...rest];
      });
    });

    return unsubscribe;
  }, [appendDetailMessage]);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (roleFilter !== 'all' && t.userRole !== roleFilter) return false;
      if (!term) return true;
      return (t.userName || '').toLowerCase().includes(term);
    });
  }, [threads, search, roleFilter]);

  const openThread = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await getSupportThread(userId);
      setDetail(data);
      // Mở hội thoại = admin đã xem hết, phản ánh ngay số chưa đọc về 0 trong danh sách.
      setThreads((prev) => prev.map((t) => (t.userId === userId ? { ...t, unreadCount: 0 } : t)));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được hội thoại.'));
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [detail?.messages.length]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || !selectedUserId || sending) return;

    setSending(true);
    try {
      const sent = await sendSupportMessage(selectedUserId, message);
      appendDetailMessage(sent);
      setThreads((prev) => {
        const rest = prev.filter((t) => t.userId !== selectedUserId);
        const current = prev.find((t) => t.userId === selectedUserId);
        const updated: SupportThreadSummary = current
          ? { ...current, lastMessage: message, lastMessageAt: sent.createdAt, lastMessageFromAdmin: true, unreadCount: 0 }
          : {
              supportThreadId: detail?.supportThreadId ?? 0,
              userId: selectedUserId,
              userName: detail?.userName ?? null,
              userAvatarUrl: detail?.userAvatarUrl ?? null,
              userRole: detail?.userRole ?? null,
              lastMessage: message,
              lastMessageAt: sent.createdAt,
              lastMessageFromAdmin: true,
              unreadCount: 0,
            };
        return [updated, ...rest];
      });
      setDraft('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gửi tin nhắn thất bại.'));
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại đúng file đó lần nữa
    if (!file || !selectedUserId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file hình ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh vượt quá 5MB.');
      return;
    }

    setImageSending(true);
    try {
      const sent = await sendSupportImage(selectedUserId, file);
      appendDetailMessage(sent);
      setThreads((prev) => {
        const rest = prev.filter((t) => t.userId !== selectedUserId);
        const current = prev.find((t) => t.userId === selectedUserId);
        if (!current) return prev;
        return [{ ...current, lastMessage: '📷 Hình ảnh', lastMessageAt: sent.createdAt, lastMessageFromAdmin: true, unreadCount: 0 }, ...rest];
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gửi hình ảnh thất bại.'));
    } finally {
      setImageSending(false);
    }
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };

  const applyQuickReply = (message: string) => {
    setDraft(message);
    textareaRef.current?.focus();
  };

  let lastDividerKey = '';

  return (
    <PageContainer
      eyebrow="Hỗ trợ người dùng"
      title="Nhắn tin hỗ trợ"
      subtitle="Trao đổi trực tiếp với gia sư, phụ huynh và học sinh."
      maxWidth="full"
    >
      <SectionCard className={styles.card}>
        <div className={styles.workspace}>
          {/* Conversation list */}
          <section className={styles.convPane}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Tìm theo tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.roleFilter} role="tablist" aria-label="Lọc theo vai trò">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={roleFilter === tab.key ? styles.roleFilterActive : ''}
                  onClick={() => setRoleFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.convList}>
              {threadsLoading ? (
                <div className={styles.emptyList}>Đang tải...</div>
              ) : filteredThreads.length === 0 ? (
                <div className={styles.emptyList}>
                  {search || roleFilter !== 'all' ? 'Không có hội thoại phù hợp.' : 'Chưa có hội thoại nào.'}
                </div>
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={t.userId}
                    type="button"
                    className={`${styles.convItem} ${selectedUserId === t.userId ? styles.convItemSelected : ''}`}
                    onClick={() => void openThread(t.userId)}
                  >
                    <span className={`${styles.avatar} ${avatarClass(t.userRole)}`}>
                      {t.userAvatarUrl ? <img src={t.userAvatarUrl} alt="" /> : initialsOf(t.userName)}
                    </span>
                    <span className={styles.convMain}>
                      <span className={styles.convRow1}>
                        <span className={styles.convName}>{t.userName || 'Người dùng'}</span>
                        <span className={`${styles.roleChip} ${roleChipClass(t.userRole)}`}>
                          {ROLE_LABEL[t.userRole || ''] || t.userRole}
                        </span>
                        <span className={styles.convTime}>{formatListTime(t.lastMessageAt)}</span>
                      </span>
                      <span className={styles.convRow2}>
                        <span className={styles.convPreview}>
                          {t.lastMessageFromAdmin ? `Bạn: ${t.lastMessage ?? ''}` : t.lastMessage || '—'}
                        </span>
                        {t.unreadCount > 0 && <span className={styles.unreadBadge}>{t.unreadCount}</span>}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Thread */}
          <section className={styles.threadPane}>
            {!selectedUserId ? (
              <div className={styles.threadEmpty}>Chọn một hội thoại để bắt đầu trả lời</div>
            ) : (
              <>
                <div className={styles.threadHeader}>
                  <div className={styles.threadHeaderId}>
                    <span className={`${styles.avatar} ${avatarClass(detail?.userRole ?? null)}`}>
                      {detail?.userAvatarUrl ? <img src={detail.userAvatarUrl} alt="" /> : initialsOf(detail?.userName ?? null)}
                    </span>
                    <div className={styles.threadWho}>
                      <h2>{detail?.userName || 'Người dùng'}</h2>
                      <div className={styles.threadSub}>
                        <span className={`${styles.roleChip} ${roleChipClass(detail?.userRole ?? null)}`}>
                          {ROLE_LABEL[detail?.userRole || ''] || detail?.userRole}
                        </span>
                        {detail?.userPhone && (
                          <>
                            <span>·</span>
                            <span>{detail.userPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.threadScroll} ref={scrollRef}>
                  {detailLoading ? (
                    <div className={styles.threadLoading}>Đang tải...</div>
                  ) : !detail || detail.messages.length === 0 ? (
                    <div className={styles.threadEmptyMessages}>Chưa có tin nhắn nào — bắt đầu trò chuyện bên dưới.</div>
                  ) : (
                    detail.messages.map((m) => {
                      const dividerKey = m.createdAt ? new Date(m.createdAt).toDateString() : '';
                      const showDivider = dividerKey !== lastDividerKey;
                      lastDividerKey = dividerKey;
                      return (
                        <React.Fragment key={m.supportMessageId}>
                          {showDivider && <span className={styles.dayDivider}>{formatDayDivider(m.createdAt)}</span>}
                          <div className={`${styles.msgRow} ${m.senderSide === 'admin' ? styles.msgRowMine : styles.msgRowTheirs}`}>
                            <p className={styles.msgSender}>
                              {m.senderSide === 'admin' ? m.senderName || 'Admin' : detail.userName || 'Người dùng'}
                            </p>
                            {m.messageType === 'image' ? (
                              <a href={m.message} target="_blank" rel="noreferrer" className={styles.imageBubbleLink}>
                                <img src={m.message} alt="Hình ảnh đính kèm" className={styles.imageBubble} />
                              </a>
                            ) : (
                              <div className={styles.bubble}>{m.message}</div>
                            )}
                            <span className={styles.msgTime}>{formatMsgTime(m.createdAt)}</span>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                <div className={styles.composer}>
                  <div className={styles.composerQuicktags}>
                    {QUICK_REPLIES.map((q) => (
                      <span key={q.label} className={styles.quicktag} onClick={() => applyQuickReply(q.message)}>
                        {q.label}
                      </span>
                    ))}
                  </div>
                  <div className={styles.composerRow}>
                    <div className={styles.composerTools}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => void handleImageSelect(e)}
                      />
                      <button
                        className={styles.toolBtn}
                        type="button"
                        title="Đính kèm ảnh"
                        aria-label="Đính kèm ảnh"
                        disabled={imageSending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder={`Trả lời ${detail?.userName || ''}...`}
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <button className={styles.sendBtn} type="button" disabled={!draft.trim() || sending} onClick={() => void handleSend()}>
                      {sending ? 'Đang gửi...' : 'Gửi'}
                      {!sending && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Context */}
          <aside className={styles.contextPane}>
            {!detail ? (
              <div className={styles.threadEmpty}>—</div>
            ) : (
              <>
                <div className={`${styles.contextBlock} ${styles.contextProfile}`}>
                  <span className={`${styles.avatar} ${avatarClass(detail.userRole)}`} style={{ width: 56, height: 56, fontSize: 19 }}>
                    {detail.userAvatarUrl ? <img src={detail.userAvatarUrl} alt="" /> : initialsOf(detail.userName)}
                  </span>
                  <h3>{detail.userName || 'Người dùng'}</h3>
                  <span className={`${styles.roleChip} ${roleChipClass(detail.userRole)}`}>
                    {ROLE_LABEL[detail.userRole || ''] || detail.userRole}
                  </span>
                </div>

                <div className={styles.contextBlock}>
                  <p className={styles.contextLabel}>Liên hệ</p>
                  <div className={styles.kvList}>
                    <div className={styles.kvRow}>
                      <svg className={styles.kvIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{detail.userPhone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className={styles.kvRow}>
                      <svg className={styles.kvIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 6l-10 7L2 6" />
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                      </svg>
                      <span>{detail.userEmail || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </SectionCard>
    </PageContainer>
  );
};

export default AdminSupportInboxPage;
