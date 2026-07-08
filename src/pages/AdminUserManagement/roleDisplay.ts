/**
 * Shared role-display helper for the Admin User Management area.
 *
 * Single source of truth so the user list, detail modal, warning modal
 * and block modal all show the same Vietnamese label / icon / badge color
 * for a given role. Adding a new role only requires updating this file.
 *
 * BE returns lowercase role strings ("tutor", "parent", "student", "admin"),
 * but we still normalize defensively in case a future endpoint returns
 * mixed casing.
 */

import type { StatusVariant } from '../../components/shared/StatusBadge/StatusBadge';

export interface RoleDisplay {
    /** Vietnamese label shown to admin users */
    label: string;
    /** StatusBadge variant — picks the badge color */
    variant: StatusVariant;
    /** Material Symbols icon name used in detail headers */
    icon: string;
}

const ROLE_MAP: Record<string, RoleDisplay> = {
    tutor: { label: 'Gia sư', variant: 'info', icon: 'school' },
    parent: { label: 'Phụ huynh', variant: 'warning', icon: 'family_restroom' },
    student: { label: 'Học viên', variant: 'neutral', icon: 'person' },
    admin: { label: 'Quản trị', variant: 'dark', icon: 'admin_panel_settings' },
    staff: { label: 'Nhân viên', variant: 'success', icon: 'support_agent' },
};

/**
 * Resolve a raw `primaryrole` value into its display metadata.
 * Returns a sensible fallback for unknown/empty values so the UI never
 * silently mislabels a user (the previous code defaulted everything
 * non-tutor/non-admin to "Học viên", which mis-tagged Parent accounts).
 */
export function getRoleDisplay(role: string | null | undefined): RoleDisplay {
    const normalized = (role ?? '').toLowerCase();
    return (
        ROLE_MAP[normalized] ?? {
            // Unknown role: surface the raw value so admins can investigate
            // instead of falling back to a wrong-but-plausible label.
            label: role || 'Không xác định',
            variant: 'neutral',
            icon: 'person',
        }
    );
}
