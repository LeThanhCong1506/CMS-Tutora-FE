import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    getUnreadCountByType,
    markAsReadByType,
    type NotificationDTO,
} from '../services/notification.service';
import { signalRService } from '../services/signalr.service';

export type BadgesByPath = Record<string, number>;

/**
 * Sidebar badge per-tab — đếm số notification chưa đọc theo `type` rồi map
 * sang path tab tương ứng. Dùng song song với `useUnreadMessageBadge` (chat
 * unread đếm riêng, không qua hệ thống notification).
 *
 * Behavior:
 *  1. Mount: fetch `/notifications/mine/unread-count` → lấy `byType` dict.
 *  2. Realtime: `subscribeToNotifications` (multi-subscriber) — KHÔNG dùng
 *     `onNotificationReceived` để không clobber handler bell ở PortalLayout.
 *  3. Auto-clear: khi user vào path matching → `markAsReadByType` cho từng
 *     type thuộc tab đó (1 request/type) + reset local count = 0.
 *
 * @param typesByPath  Map sidebar path → list notification type thuộc tab đó.
 *                     **Phải stable** (module-scope const hoặc useMemo) —
 *                     ref-change sẽ trigger re-subscribe SignalR.
 */
export function useUnreadBadgesByTab(
    typesByPath: Record<string, string[]>,
): BadgesByPath {
    const [countsByType, setCountsByType] = useState<Record<string, number>>({});
    const location = useLocation();

    // Ref để callback SignalR luôn đọc pathname mới nhất mà không phải resubscribe.
    const pathnameRef = useRef(location.pathname);
    useEffect(() => {
        pathnameRef.current = location.pathname;
    });

    // 1. Initial fetch — dict { type → count }
    useEffect(() => {
        let cancelled = false;
        getUnreadCountByType()
            .then((dict) => {
                if (!cancelled) setCountsByType(dict);
            })
            .catch(() => {
                /* keep empty dict */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // 2. SignalR realtime
    useEffect(() => {
        const unsubscribe = signalRService.subscribeToNotifications((noti: NotificationDTO) => {
            // Noti chưa có `type` (legacy BE) → bỏ qua, vẫn được đếm ở bell global.
            if (!noti.type) return;

            const matchedPath = Object.entries(typesByPath).find(([, types]) =>
                types.includes(noti.type as string),
            )?.[0];
            if (!matchedPath) return;

            // Nếu user đang ở chính tab đó → coi như đã thấy: BE mark-read luôn, không bump badge.
            if (pathnameRef.current.startsWith(matchedPath)) {
                markAsReadByType(noti.type as string).catch(() => {});
                return;
            }

            setCountsByType((prev) => ({
                ...prev,
                [noti.type as string]: (prev[noti.type as string] || 0) + 1,
            }));
        });
        return unsubscribe;
    }, [typesByPath]);

    // 3. Auto-clear khi navigate vào tab matching
    useEffect(() => {
        const matchedPath = Object.keys(typesByPath).find((p) =>
            location.pathname.startsWith(p),
        );
        if (!matchedPath) return;

        const dirtyTypes = typesByPath[matchedPath].filter(
            (t) => (countsByType[t] || 0) > 0,
        );
        if (dirtyTypes.length === 0) return;

        // Optimistic local clear
        setCountsByType((prev) => {
            const next = { ...prev };
            for (const t of dirtyTypes) next[t] = 0;
            return next;
        });

        // BE: 1 request / type. BE sẽ push NotificationCountUpdated → chuông tự sync.
        dirtyTypes.forEach((t) => {
            markAsReadByType(t).catch(() => {});
        });
    }, [location.pathname, countsByType, typesByPath]);

    // 4. Tính badge map (sum của các type thuộc cùng 1 tab)
    return useMemo(() => {
        const result: BadgesByPath = {};
        for (const [path, types] of Object.entries(typesByPath)) {
            let sum = 0;
            for (const t of types) sum += countsByType[t] || 0;
            result[path] = sum;
        }
        return result;
    }, [countsByType, typesByPath]);
}
