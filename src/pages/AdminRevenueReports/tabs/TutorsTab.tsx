import { useState } from 'react';
import { count, money, moneyVnd } from '@/utils/formatMoney';
import { matchesSearch } from '@/utils/vietnameseSearch';
import MetricCard from '../components/MetricCard';
import InfoHint from '../components/InfoHint';
import { FilterChips, SearchInput, SortSelect, TableToolbar } from '../components/TableToolbar';
import { PersonName } from '../components/PersonName';
import { chartPersonLabel, findDuplicateNames } from '../components/personIdentity';
import { getTutorRevenue } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { useClientPagination } from '@/hooks/useClientPagination';
import {
    ChartBlock,
    DataTableShell,
    ReportEmpty,
    ReportError,
} from '../components/ReportShell';
import ReportSkeleton from '../components/ReportSkeleton';
import { RankBarChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE, rankHeight } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { TutorRevenueRow } from '@/types/revenueReports.types';

/**
 * Ba chỉ tiêu xếp hạng. `escrowHeld` đã BỎ khỏi bộ chọn: nó là SỐ DƯ HIỆN TẠI của ví, không
 * thuộc khoảng thời gian nào, nên xếp hạng gia sư theo nó trong một trang có bộ lọc thời gian
 * là so hai thứ khác đơn vị đo. Tổng escrow toàn sàn vẫn còn ở thẻ chỉ số, và số của từng gia
 * sư vẫn còn ở cột "Giữ hộ" của bảng — chỗ nó thuộc về.
 */
type RankMetric = 'tutorFeeRevenue' | 'gmv' | 'sessionsDelivered';

const metricMeta: Record<
    RankMetric,
    { label: string; name: string; money: boolean; color: string; hint: string }
> = {
    tutorFeeRevenue: {
        label: 'Phí gia sư đã ghi nhận',
        name: 'Phí gia sư',
        money: true,
        color: PALETTE.navy,
        hint: 'Phần doanh thu đến TỪ GIA SƯ này: 5% cắt từ tiền gia sư, của những buổi họ đã dạy xong trong kỳ. KHÔNG gồm 5% phí dịch vụ khách trả — nửa đó đến từ khách hàng nên nằm ở tab Phụ huynh/học sinh. Vì vậy tổng trang này nhỏ hơn "Doanh thu đã ghi nhận" ở tab Doanh thu, đúng bằng một nửa nguồn.',
    },
    gmv: {
        label: 'Giá trị lịch đặt',
        name: 'Giá trị lịch đặt',
        money: true,
        color: PALETTE.blue,
        hint: 'Tổng giá trị lịch đặt cho gia sư này, theo giá hợp đồng — không phải tiền mặt đã vào. Lớn hơn doanh thu khoảng 10 lần vì phần lớn chảy về gia sư.',
    },
    sessionsDelivered: {
        label: 'Số buổi đã dạy',
        name: 'Số buổi',
        money: false,
        color: PALETTE.emerald,
        hint: 'Số buổi đã dạy xong và được xác nhận. Đo năng suất chứ không đo giá trị — gia sư dạy nhiều buổi giá thấp vẫn xếp trên.',
    },
};

/**
 * Ba nhóm của bảng chi tiết. Là một PHÂN HOẠCH thật: mỗi gia sư thuộc đúng một nhóm, nên số
 * trên hai chip con cộng lại bằng chip "Tất cả".
 *
 * Nhóm "chưa dạy buổi nào" tách riêng vì nó là tệp admin hay phải tra: họ có lịch, có thể có
 * buổi bị huỷ, nhưng mọi cột tiền của họ đều bằng 0 — trộn chung thì họ nằm rải rác ở cuối
 * bảng theo thứ tự doanh thu.
 */
type TutorGroup = 'all' | 'teaching' | 'idle';

const TUTOR_GROUPS: { key: TutorGroup; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'teaching', label: 'Đã dạy' },
    { key: 'idle', label: 'Chưa dạy buổi nào' },
];

type TutorSort = 'revenue' | 'gmv' | 'sessions' | 'cancel' | 'dispute' | 'escrow';

const TUTOR_SORTS: { key: TutorSort; label: string }[] = [
    { key: 'revenue', label: 'Doanh thu cao nhất' },
    { key: 'gmv', label: 'Giá trị lịch đặt cao nhất' },
    { key: 'sessions', label: 'Dạy nhiều buổi nhất' },
    { key: 'cancel', label: 'Tỷ lệ hủy cao nhất' },
    { key: 'dispute', label: 'Nhiều khiếu nại nhất' },
    { key: 'escrow', label: 'Giữ hộ nhiều nhất' },
];

const TUTOR_SORTERS: Record<TutorSort, (a: TutorRevenueRow, b: TutorRevenueRow) => number> = {
    revenue: (a, b) => b.tutorFeeRevenue - a.tutorFeeRevenue,
    gmv: (a, b) => b.gmv - a.gmv,
    sessions: (a, b) => b.sessionsDelivered - a.sessionsDelivered,
    cancel: (a, b) => b.cancelRate - a.cancelRate,
    dispute: (a, b) => b.disputeCount - a.disputeCount,
    escrow: (a, b) => b.escrowHeld - a.escrowHeld,
};

/**
 * Lọc theo nhóm + từ khoá rồi sắp xếp. Nhận `undefined` vì hook phân trang chạy trước khi
 * dữ liệu về.
 *
 * `revenue` là mặc định vì đó đúng là thứ tự backend đã trả (`OrderByDescending(TutorFeeRevenue)`)
 * — mở trang lên chưa đụng gì thì bảng không được tự đổi thứ tự.
 *
 * Lưu ý khi chọn "Tỷ lệ hủy cao nhất": người chưa dạy buổi nào mà có buổi bị huỷ luôn ra tròn
 * 100% nên chiếm sạch đầu bảng. Bấm thêm chip "Đã dạy" thì mới ra danh sách đáng lo thật —
 * đúng cặp bộ lọc mà biểu đồ "Tỷ lệ hủy buổi theo gia sư" phía trên đã cứng hoá sẵn.
 */
const selectTutors = (
    rows: TutorRevenueRow[] | undefined,
    group: TutorGroup,
    query: string,
    sort: TutorSort,
): TutorRevenueRow[] => {
    if (!rows) return [];

    let out = rows;
    if (group === 'teaching') out = out.filter((t) => t.sessionsDelivered > 0);
    if (group === 'idle') out = out.filter((t) => t.sessionsDelivered === 0);

    if (query.trim()) {
        out = out.filter((t) => matchesSearch(query, t.tutorName, t.subject, t.contact, t.tutorId));
    }

    return [...out].sort(TUTOR_SORTERS[sort]);
};

const TutorsTab = ({ range }: { range: RevenueRange }) => {
    const [metric, setMetric] = useState<RankMetric>('tutorFeeRevenue');
    const [group, setGroup] = useState<TutorGroup>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<TutorSort>('revenue');
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getTutorRevenue(r, 50),
        range,
    );
    const allTutors = data?.tutors;
    const tutorRows = selectTutors(allTutors, group, query, sort);
    const tutorPage = useClientPagination(tutorRows);

    // Đếm trên TOÀN BỘ dữ liệu, không phải trên kết quả đã lọc — xem `ChipItem.count`.
    const groupCounts = {
        all: allTutors?.length ?? 0,
        teaching: (allTutors ?? []).filter((t) => t.sessionsDelivered > 0).length,
        idle: (allTutors ?? []).filter((t) => t.sessionsDelivered === 0).length,
    };

    if (loading) return <ReportSkeleton metrics={2} charts={2} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.tutors.length === 0) {
        return <ReportEmpty label="Chưa có gia sư nào phát sinh doanh thu trong kỳ" />;
    }

    const meta = metricMeta[metric];

    // Tính trên TOÀN BỘ gia sư của kỳ, không phải trên trang đang xem: hai người trùng tên
    // rơi vào hai trang khác nhau thì vẫn là trùng, và bộ lọc không được làm chuỗi phân biệt
    // lúc có lúc không.
    const dupNames = findDuplicateNames(
        data.tutors.map((t) => ({ name: t.tutorName, contact: t.contact })),
    );

    // Lọc bỏ giá trị 0 trước khi cắt top 15: gia sư có lịch mà chưa dạy được buổi nào vẫn nằm
    // trong `tutors` (họ cần có mặt ở bảng chi tiết), nhưng trên biểu đồ XẾP HẠNG họ thành
    // những vạch dài bằng 0 nối đuôi nhau ở đáy — chiếm chỗ mà không xếp hạng gì cả. Số lượng
    // của họ đã được nói bằng chữ ở thẻ "Gia sư có doanh thu" rồi.
    const ranked = [...data.tutors]
        .filter((t) => (t[metric] as number) > 0)
        .sort((a, b) => (b[metric] as number) - (a[metric] as number))
        .slice(0, 15)
        .map((t) => ({ ...t, label: chartPersonLabel(t.tutorName, t.contact, dupNames) }));

    // Chỉ xếp hạng gia sư ĐÃ DẠY ít nhất một buổi.
    //
    // `cancelRate = huỷ / (đã dạy + huỷ)`, nên người chưa dạy buổi nào mà có buổi bị huỷ luôn
    // ra tròn 100% — và vì bảng sắp giảm dần, ba cái 100% đó chiếm sạch đầu bảng. Người đọc
    // thấy "gia sư huỷ nhiều nhất" hoá ra là ba người chưa từng dạy, còn hai ca đáng lo thật
    // (52% trên 34 buổi, 56% trên 11 buổi) bị đẩy xuống dưới.
    //
    // Nhóm chưa dạy buổi nào đã được đếm bằng chữ ở thẻ "Gia sư có doanh thu" — đó mới là chỗ
    // của họ. Biểu đồ này trả lời câu khác: trong số người ĐANG dạy, ai hay huỷ.
    /**
     * Cột "Giữ hộ" là NGOẠI LỆ duy nhất của bảng: mọi cột khác cắt theo mốc thời gian đang
     * chọn, riêng cột này đọc `wallet.Frozenbalance` — số dư ví ngay lúc này, gộp mọi thời kỳ.
     * Không nói rõ thì hàng "0 buổi · giữ hộ 475.000" đọc như số liệu sai.
     *
     * Câu cuối là câu quan trọng nhất: nó biến cột này thành công cụ soi tiền kẹt. Trên dev
     * 01/09/2026 có 641.250đ nằm ở 3 khoá đã đóng mà escrow chưa chốt (#275, #276, #278) —
     * phụ huynh đã trả, gia sư chưa nhận, cũng chưa hoàn ai. Đừng "sửa" cột này bằng cách cho
     * nó về 0 khi kỳ không có buổi: làm vậy là giấu mất đúng khoản đó.
     */
    const escrowHint =
        'Tiền đang giữ trong ví gia sư, chờ giải ngân khi buổi học hoàn tất.'
        + '\n\nĐây là số dư HIỆN TẠI của ví, tính trên mọi thời kỳ — cột duy nhất trong bảng'
        + ' KHÔNG đổi khi bạn đổi mốc thời gian. Vì vậy một gia sư có thể hiện 0 buổi trong kỳ'
        + ' mà vẫn có số ở đây: đó là tiền của những buổi khách đã trả nhưng chưa dạy, kể cả'
        + ' lịch đặt từ trước kỳ đang xem.'
        + '\n\nSố này chỉ về 0 khi khoá kết thúc và tiền đã chia xong. Nếu một khoá đã đóng mà'
        + ' đây vẫn còn số, đó là tiền kẹt — cần đối soát lại luồng escrow.';

    const cancelRanked = [...data.tutors]
        .filter((t) => t.cancelRate > 0 && t.sessionsDelivered > 0)
        .sort((a, b) => b.cancelRate - a.cancelRate)
        .slice(0, 12)
        .map((t) => ({ ...t, label: chartPersonLabel(t.tutorName, t.contact, dupNames) }));

    return (
        <div className="rev-stack">
            {/* `.rev-strip` — khuôn dải chỉ số dùng chung cho cả 5 tab (thống nhất 01/09/2026):
                MỘT thẻ trắng, các ô ngăn nhau bằng kẻ mảnh. Trước đây tab này dùng
                `.rev-metric-grid` (thẻ rời, mỗi thẻ một viền), tab Doanh thu lại dùng
                `.rev-strip` — hai trang được chọn làm chuẩn mà không khớp nhau. */}
            {/* Thứ tự thẻ: HAI THẺ TIỀN trước, thẻ đếm người sau (đổi 02/09/2026).

                Cùng thứ tự với tab Phụ huynh/học sinh — hai thẻ phí dịch vụ rồi mới tới giá trị booking
                trung bình. Đây là cụm báo cáo DOANH THU nên con số tiền phải đứng đầu; số gia sư
                là bối cảnh để đọc hai số đó, không phải thứ cần đọc trước.

                Bonus: hai thẻ có nền màu giờ đứng liền nhau nên cặp xanh–vàng (đã ghi nhận /
                đợi ghi nhận) đọc thành một cặp, thay vì bị thẻ trắng chen vào giữa. */}
            <div className="rev-strip">
                {/* Hai thẻ phí gia sư đặt CẠNH NHAU và đặt tên song song với hai thẻ phí dịch
                    vụ của tab Phụ huynh/học sinh ("Phí DV đã ghi nhận" / "Phí DV đợi ghi nhận").

                    Trước 02/09/2026 tab này chỉ có vế ĐÃ ghi nhận, tên là "Doanh thu từ phí gia
                    sư", trong khi tab Phụ huynh/học sinh có đủ hai vế. Hai tab là hai NỬA của cùng một
                    phí sàn 10%, mà một bên báo đủ cặp còn bên kia báo một nửa thì không đọc
                    được như một cặp. */}
                <MetricCard
                    icon="verified"
                    value={moneyVnd(data.totalTutorFeeRevenue)}
                    label="Phí gia sư đã ghi nhận"
                    subLabel="của buổi dạy trong kỳ"
                    valueTone="recognised"
                    badgeVariant="green"
                    hint="Tổng 5% cắt từ tiền gia sư, của các buổi đã dạy xong trong kỳ — phần ĐÃ thành tiền thật. Đây là MỘT trong hai nguồn của phí sàn 10%; nguồn còn lại là 5% phí dịch vụ khách trả, xem tab Phụ huynh/học sinh. Cộng hai nguồn mới ra 'Doanh thu đã ghi nhận' của tab Doanh thu.

LƯU Ý MỐC THỜI GIAN: thẻ này neo theo NGÀY DẠY (doanh thu kế toán của kỳ), còn thẻ ‘đợi ghi nhận’ bên cạnh neo theo NGÀY ĐẶT LỊCH. Hai mốc khác nhau nên KHÔNG cộng hai thẻ lại để so với phí sàn — muốn xem phí sàn của lịch đặt trong kỳ đi về đâu thì xem khối ‘Phân bổ tiền khách trả’ ở tab Doanh thu, chỗ đó có đủ ba số phận và cộng khít."
                />
                <MetricCard
                    icon="hourglass_top"
                    value={moneyVnd(data.totalTutorFeePending)}
                    label="Phí gia sư đợi ghi nhận"
                    subLabel="của lịch đặt trong kỳ"
                    valueTone="pending"
                    badgeVariant="orange"
                    hint="5% phí gia sư của những buổi ĐÃ BÁN nhưng chưa dạy. Buổi chưa dạy thì gia sư chưa được giải ngân, nên Tutora cũng chưa có gì để cắt. Với khoá ĐANG CHẠY, cộng hai thẻ ra đúng tổng phí gia sư của lịch đặt trong kỳ.&#10;&#10;Khoá đã đóng sổ thì vế chờ về 0 — buổi chưa dạy đã bị huỷ, không còn gì để chờ. Nên khi trong kỳ có khoá đóng sổ, tổng hai thẻ NHỎ HƠN phí theo hợp đồng đúng bằng phần đã mất đó."
                />
                <MetricCard
                    icon="groups"
                    value={count(data.tutorsWithRevenue)}
                    label="Gia sư có doanh thu"
                    subLabel={
                        data.activeTutors > data.tutorsWithRevenue
                            ? `${count(data.activeTutors - data.tutorsWithRevenue)} gia sư có lịch nhưng chưa dạy được buổi nào`
                            : undefined
                    }
                    badgeVariant="blue"
                    hint="Số gia sư đã dạy xong và được xác nhận ít nhất một buổi trong kỳ. Gia sư có lịch nhưng buổi bị huỷ hết không tính vào đây."
                />
            </div>

            <ChartBlock
                title="Xếp hạng gia sư"
                hint={meta.hint}
                action={
                    <div className="rev-segmented" role="tablist" aria-label="Chỉ tiêu xếp hạng">
                        {(Object.keys(metricMeta) as RankMetric[]).map((k) => (
                            <button
                                key={k}
                                type="button"
                                role="tab"
                                aria-selected={metric === k}
                                className={metric === k ? 'is-active' : ''}
                                onClick={() => setMetric(k)}
                            >
                                {metricMeta[k].label}
                            </button>
                        ))}
                    </div>
                }
            >
                <RankBarChart
                    data={ranked}
                    labelKey="label"
                    valueKey={metric}
                    name={meta.name}
                    color={meta.color}
                    money={meta.money}
                    labelWidth={dupNames.size > 0 ? 230 : 150}
                    height={rankHeight(ranked.length)}
                />
            </ChartBlock>

            {/* Khối "Phân bố đội ngũ gia sư" đã BỎ (01/09/2026) — cả vành khuyên lẫn tán xạ.
                Cả hai đều cần một mạng lưới đủ lớn mới nói được điều gì, mà đây là trang admin
                đọc hằng ngày ở quy mô hiện tại.

                • Vành khuyên "Top 10 / 11-50 / Còn lại": dưới 10 gia sư thì cả sàn nằm gọn trong
                  lát đầu — một vòng tròn đặc 100% kèm hai mục chú giải bằng 0. Nó đã tự ẩn theo
                  `isSmallPool` từ trước, tức trên dữ liệu thật nó gần như chưa từng hiện.

                • Tán xạ "Năng suất mỗi buổi": trên dữ liệu thật 13 gia sư chỉ vẽ ra 6 chấm, vì
                  6 người trùng khít tại (1 buổi, 7.500đ) và 3 người chồng lên gốc toạ độ. Hai
                  trục của nó — số buổi và doanh thu mỗi buổi — vốn đã là hai cột trong bảng xếp
                  hạng chi tiết, nơi đọc được từng người thay vì một chấm gộp.

                Muốn dựng lại thì chờ mạng lưới đủ lớn để hai hình đó phân tách được. */}
            <ChartBlock
                title="Tỷ lệ hủy buổi theo gia sư"
                hint="Tỷ lệ buổi bị hủy hoặc vắng mặt trên tổng số buổi, sắp xếp giảm dần. Gia sư ở nhóm đầu vừa làm mất doanh thu vừa dễ dẫn tới khiếu nại. Chỉ tính gia sư đã dạy ít nhất một buổi — người chưa dạy buổi nào luôn ra 100% nên vào đây chỉ che mất các ca đáng lo thật; số lượng nhóm đó xem ở thẻ đầu trang."
            >
                <RankBarChart
                    data={cancelRanked}
                    labelKey="label"
                    valueKey="cancelRate"
                    name="Tỷ lệ hủy"
                    color={PALETTE.red}
                    percent
                    labelWidth={dupNames.size > 0 ? 230 : 150}
                    height={rankHeight(cancelRanked.length)}
                />
            </ChartBlock>

            <DataTableShell
                title="Bảng xếp hạng chi tiết"
                action={
                    <TableToolbar>
                        <FilterChips
                            ariaLabel="Lọc nhóm gia sư"
                            items={TUTOR_GROUPS.map((g) => ({ ...g, count: groupCounts[g.key] }))}
                            value={group}
                            onChange={(key) => {
                                setGroup(key);
                                tutorPage.setPage(1);
                            }}
                        />
                        <SearchInput
                            value={query}
                            placeholder="Tên gia sư, môn…"
                            ariaLabel="Tìm trong danh sách gia sư"
                            onChange={(value) => {
                                setQuery(value);
                                tutorPage.setPage(1);
                            }}
                        />
                        <SortSelect
                            items={TUTOR_SORTS}
                            value={sort}
                            onChange={(key) => {
                                setSort(key);
                                tutorPage.setPage(1);
                            }}
                        />
                    </TableToolbar>
                }
                pagination={{
                    current: tutorPage.page,
                    pageSize: tutorPage.pageSize,
                    total: tutorPage.total,
                    onChange: tutorPage.setPage,
                }}
            >
                {tutorRows.length === 0 ? (
                    /* Phân biệt "chưa có gì" với "bộ lọc đang che hết": ca cả kỳ không có
                       gia sư nào đã chặn bằng ReportEmpty ở đầu tab, nên tới đây chỉ còn
                       nghĩa thứ hai. */
                    <ReportEmpty label="Không có gia sư nào khớp bộ lọc đang chọn" />
                ) : (
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th>Gia sư</th>
                                <th>Môn</th>
                                <th className="rev-num">Giá trị lịch đặt</th>
                                {/* Hai cột phí gia sư, đặt tên song song với "Phí DV đã ghi
                                    nhận" / "Phí DV đợi ghi nhận" của bảng khách hàng. Rút gọn
                                    "GS" vì bảng này đã 10 cột — xem thêm ở dải chỉ số. */}
                                <th className="rev-num">Phí GS đã ghi nhận</th>
                                <th className="rev-num">Phí GS đợi ghi nhận</th>
                                {/* Cột "Tỷ lệ giữ lại" (= Doanh thu ÷ Khách trả) đã BỎ 01/09/2026.
                                    Hai số đó neo theo hai mốc khác nhau — "Khách trả" tính trên lịch
                                    ĐẶT trong kỳ, "Doanh thu" tính trên buổi DẠY trong kỳ — nên tỷ lệ
                                    giữa chúng không phải take rate của bất cứ thứ gì. Trên dữ liệu
                                    thật nó ra 0,6%–9,5% trong khi phí sàn thực là 10%, tức cột này
                                    đang nói sai về chính con số quan trọng nhất của mô hình kinh
                                    doanh. Muốn có take rate thật thì phải so hai số CÙNG một tập
                                    booking, không suy được từ hai cột đứng cạnh nhau ở đây. */}
                                <th className="rev-num">Gia sư nhận</th>
                                {/* ⓘ ĐẦU TIÊN đặt trên một tiêu đề cột, và nó cần thiết: đây là
                                    cột DUY NHẤT trong bảng không lọc theo mốc thời gian
                                    (`EscrowHeld = wallet.Frozenbalance`, số dư ví hiện tại). Vì
                                    thế hàng "0 buổi · giữ hộ 475.000" trông như mâu thuẫn trong
                                    khi cả hai số đều đúng — chỉ là hai mốc đo khác nhau. */}
                                <th className="rev-num">
                                    <span className="rev-th-hint">
                                        Giữ hộ
                                        <InfoHint text={escrowHint} />
                                    </span>
                                </th>
                                <th className="rev-num">Buổi</th>
                                {/* "Doanh thu/buổi" đã BỎ 01/09/2026: bằng đúng cột Doanh thu chia
                                    cột Buổi, hai cột đứng ngay cạnh nhau trong cùng hàng. */}
                                <th className="rev-num">Tỷ lệ hủy</th>
                                <th className="rev-num">Khiếu nại</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tutorPage.pageItems.map((t) => (
                                <tr key={t.tutorId}>
                                    <td>
                                        <PersonName
                                            name={t.tutorName}
                                            contact={t.contact}
                                            duplicates={dupNames}
                                            sub={t.rating > 0 ? `★ ${t.rating}` : 'Chưa có đánh giá'}
                                        />
                                    </td>
                                    <td>{t.subject}</td>
                                    <td className="rev-num">{money(t.gmv)}</td>
                                    <td className="rev-num rev-pos">{money(t.tutorFeeRevenue)}</td>
                                    <td className="rev-num rev-warn">{money(t.tutorFeePending)}</td>
                                    <td className="rev-num">{money(t.tutorEarnings)}</td>
                                    <td className="rev-num rev-warn">{money(t.escrowHeld)}</td>
                                    <td className="rev-num">{t.sessionsDelivered}</td>
                                    <td className={`rev-num ${t.cancelRate > 5 ? 'rev-neg' : ''}`}>
                                        {t.cancelRate}%
                                    </td>
                                    <td className={`rev-num ${t.disputeCount > 1 ? 'rev-neg' : ''}`}>
                                        {t.disputeCount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default TutorsTab;
