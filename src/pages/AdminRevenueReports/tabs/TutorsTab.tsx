import { useState } from 'react';
import { count, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
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
import { DonutChart, RankBarChart, ScatterChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

type RankMetric = 'platformRevenue' | 'gmv' | 'sessionsDelivered' | 'escrowHeld';

const metricMeta: Record<
    RankMetric,
    { label: string; name: string; money: boolean; color: string; hint: string }
> = {
    platformRevenue: {
        label: 'Hoa hồng mang lại',
        name: 'Hoa hồng Tutora',
        money: true,
        color: PALETTE.navy,
        hint: 'Phần Tutora thực sự giữ lại — 10% giá gốc. Con số phản ánh giá trị kinh tế thật mà gia sư mang lại.',
    },
    gmv: {
        label: 'Tiền khách trả',
        name: 'Tiền khách trả',
        money: true,
        color: PALETTE.blue,
        hint: 'Tổng tiền phụ huynh trả cho gia sư này. Lớn hơn hoa hồng khoảng 10 lần vì phần lớn chảy về gia sư.',
    },
    sessionsDelivered: {
        label: 'Số buổi đã dạy',
        name: 'Số buổi',
        money: false,
        color: PALETTE.emerald,
        hint: 'Số buổi đã dạy xong và được xác nhận. Đo năng suất chứ không đo giá trị — gia sư dạy nhiều buổi giá thấp vẫn xếp trên.',
    },
    escrowHeld: {
        label: 'Tiền đang giữ hộ',
        name: 'Giữ hộ',
        money: true,
        color: PALETTE.amber,
        hint: 'Tiền đang giữ hộ cho gia sư này, sẽ chuyển khi buổi học hoàn tất. Đây là nợ phải trả, không phải tiền của nền tảng.',
    },
};

const TutorsTab = ({ range }: { range: RevenueRange }) => {
    const [metric, setMetric] = useState<RankMetric>('platformRevenue');
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getTutorRevenue(r, 50),
        range,
    );
    const tutorPage = useClientPagination(data?.tutors ?? []);

    if (loading) return <ReportSkeleton charts={3} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.tutors.length === 0) {
        return <ReportEmpty label="Chưa có gia sư nào phát sinh doanh thu trong kỳ" />;
    }

    const meta = metricMeta[metric];
    const ranked = [...data.tutors]
        .sort((a, b) => (b[metric] as number) - (a[metric] as number))
        .slice(0, 15)
        .map((t) => ({ ...t, label: t.tutorName }));

    const concentrationTotal = data.concentration.reduce((s, d) => s + d.value, 0);
    const top10Share = concentrationTotal > 0
        ? (data.concentration[0].value / concentrationTotal) * 100
        : 0;

    // Khi số gia sư có doanh thu chưa quá 10 thì "top 10 chiếm bao nhiêu" luôn bằng 100% —
    // con số đó không đo được mức tập trung, mà badge "Rủi ro tập trung" lại kêu như báo động
    // thật. Đổi sang đo gia sư dẫn đầu, câu hỏi vẫn đúng nghĩa ở mọi quy mô.
    const isSmallPool = data.tutorsWithRevenue <= 10;
    const topTutorShare = data.totalPlatformRevenue > 0
        ? (Math.max(...data.tutors.map((t) => t.platformRevenue), 0)
            / data.totalPlatformRevenue) * 100
        : 0;
    const concentration = isSmallPool
        ? {
            value: topTutorShare,
            label: 'Gia sư dẫn đầu chiếm',
            hint: 'Phần trăm hoa hồng đến từ gia sư đứng đầu. Hệ thống mới có '
                + `${data.tutorsWithRevenue} gia sư phát sinh doanh thu nên chưa đo được mức tập `
                + 'trung theo nhóm 10 người — chỉ số này sẽ tự đổi khi mạng lưới lớn hơn.',
            risky: topTutorShare > 50,
        }
        : {
            value: top10Share,
            label: 'Top 10 chiếm doanh thu',
            hint: 'Phần trăm hoa hồng đến từ 10 gia sư hàng đầu. Trên 50% nghĩa là nền tảng phụ '
                + 'thuộc vào một nhóm nhỏ, mất vài người là mất doanh thu.',
            risky: top10Share > 50,
        };

    const totalSessions = data.tutors.reduce((s, t) => s + t.sessionsDelivered, 0);
    const avgPerSession = totalSessions > 0 ? data.totalPlatformRevenue / totalSessions : 0;

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
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
                <MetricCard
                    icon="payments"
                    value={moneyVnd(data.totalPlatformRevenue)}
                    label="Hoa hồng Tutora"
                    badgeVariant="green"
                    hint="Tổng hoa hồng Tutora thu được từ các buổi gia sư đã dạy xong, bằng 10% giá gốc. Không tính phần chảy về gia sư."
                />
                <MetricCard
                    icon="lock_clock"
                    value={moneyVnd(data.totalEscrowHeld)}
                    label="Tiền đang giữ hộ"
                    badgeVariant="orange"
                    hint="Tiền giữ hộ, sẽ chuyển cho gia sư khi buổi học được xác nhận hoàn tất — là nợ phải trả, không phải tiền của nền tảng. Số dư tính tại hiện tại nên không đổi theo khoảng thời gian."
                />
                <MetricCard
                    icon="warning"
                    value={`${concentration.value.toFixed(1)}%`}
                    label={concentration.label}
                    badge={concentration.risky ? 'Rủi ro tập trung' : 'Phân bổ tốt'}
                    badgeVariant={concentration.risky ? 'red' : 'green'}
                    hint={concentration.hint}
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
                    height={420}
                />
            </ChartBlock>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Mức độ tập trung doanh thu"
                    hint="Doanh thu phụ thuộc bao nhiêu vào nhóm gia sư đầu bảng. Trên 50% là nền tảng đang dựa vào một nhóm nhỏ."
                >
                    <DonutChart
                        data={data.concentration}
                        centerLabel="Tổng doanh thu"
                        height={280}
                    />
                </ChartBlock>

                <ChartBlock
                    title="Năng suất và giá trị mỗi buổi"
                    subtitle={`Trung bình toàn sàn: ${moneyVnd(avgPerSession)}/buổi`}
                    hint="Trục ngang là số buổi đã dạy, trục dọc là doanh thu mỗi buổi, kích thước điểm là tổng doanh thu. Góc trên bên phải là gia sư ngôi sao: dạy nhiều và giá cao."
                >
                    <ScatterChart
                        points={data.tutors.map((t) => ({
                            x: t.sessionsDelivered,
                            y: t.revenuePerSession,
                            size: t.platformRevenue,
                            name: t.tutorName,
                        }))}
                        xName="Số buổi đã dạy"
                        yName="Doanh thu mỗi buổi"
                        height={280}
                    />
                </ChartBlock>
            </div>

            <ChartBlock
                title="Tỷ lệ hủy buổi theo gia sư"
                hint="Tỷ lệ buổi bị hủy hoặc vắng mặt trên tổng số buổi, sắp xếp giảm dần. Gia sư ở nhóm đầu vừa làm mất doanh thu vừa dễ dẫn tới khiếu nại."
            >
                <RankBarChart
                    data={[...data.tutors]
                        .filter((t) => t.cancelRate > 0)
                        .sort((a, b) => b.cancelRate - a.cancelRate)
                        .slice(0, 12)
                        .map((t) => ({ ...t, label: t.tutorName }))}
                    labelKey="label"
                    valueKey="cancelRate"
                    name="Tỷ lệ hủy"
                    color={PALETTE.red}
                    percent
                    height={340}
                />
            </ChartBlock>

            <DataTableShell
                title="Bảng xếp hạng chi tiết"
                pagination={{
                    current: tutorPage.page,
                    pageSize: tutorPage.pageSize,
                    total: tutorPage.total,
                    onChange: tutorPage.setPage,
                }}
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Gia sư</th>
                            <th>Môn</th>
                            <th className="rev-num">Khách trả</th>
                            <th className="rev-num">Hoa hồng</th>
                            <th className="rev-num">Tỷ lệ hoa hồng</th>
                            <th className="rev-num">Gia sư nhận</th>
                            <th className="rev-num">Giữ hộ</th>
                            <th className="rev-num">Buổi</th>
                            <th className="rev-num">Hoa hồng/buổi</th>
                            <th className="rev-num">Tỷ lệ hủy</th>
                            <th className="rev-num">Khiếu nại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tutorPage.pageItems.map((t) => (
                            <tr key={t.tutorId}>
                                <td>
                                    <strong>{t.tutorName}</strong>
                                    <span className="rev-cell-sub">
                                        {t.rating > 0 ? `★ ${t.rating}` : 'Chưa có đánh giá'}
                                    </span>
                                </td>
                                <td>{t.subject}</td>
                                <td className="rev-num">{money(t.gmv)}</td>
                                <td className="rev-num rev-pos">{money(t.platformRevenue)}</td>
                                <td className="rev-num">{t.gmv > 0 ? `${t.takeRate}%` : '—'}</td>
                                <td className="rev-num">{money(t.tutorEarnings)}</td>
                                <td className="rev-num rev-warn">{money(t.escrowHeld)}</td>
                                <td className="rev-num">{t.sessionsDelivered}</td>
                                <td className="rev-num">{money(t.revenuePerSession)}</td>
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
            </DataTableShell>
        </div>
    );
};

export default TutorsTab;
