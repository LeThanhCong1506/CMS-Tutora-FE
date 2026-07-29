/**
 * Flattened user shape the admin user-management screens pass around.
 *
 * Built in UserManagementPage from the admin user list API — the modals take
 * this rather than the raw API response so they stay independent of its shape.
 */
export interface FlatUserDetail {
    userid: string;
    fullname: string;
    email: string;
    phone: string;
    avatarurl: string;
    primaryrole: string;
    accountstatus: string;
    isidentityverified: boolean;
    createdat: string;
    lastloginat: string;
    warningcount: number;
    suspensioncount: number;
    walletbalance?: number;
    escrowbalance?: number;
    totalearnings?: number;
}
