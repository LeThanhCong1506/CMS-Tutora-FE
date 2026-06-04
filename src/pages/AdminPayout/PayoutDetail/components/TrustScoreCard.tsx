import React from 'react';
import { SectionCard, StatusBadge } from '../../../../components/shared';
import type { ScoreBreakdown } from '../../../../types/adminPayout.types';
import { formatTrustScore } from '../../../../utils/formatters';

interface Props {
    scoreData: ScoreBreakdown | null;
    loading: boolean;
}

const scoreVariant = (score: number): 'success' | 'warning' | 'error' | 'neutral' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    if (score > 0) return 'error';
    return 'neutral';
};

const FactorList = ({
    title,
    factors,
    tone,
}: {
    title: string;
    factors: string[];
    tone: 'positive' | 'negative';
}) => (
    <div className="payout-factor-block">
        <span className="payout-factor-title">{title}</span>
        {factors.length === 0 ? (
            <span className="admin-ui-table-meta">Không có</span>
        ) : (
            <div className="payout-factor-list">
                {factors.map((factor) => (
                    <span className={`payout-factor payout-factor-${tone}`} key={factor}>
                        {tone === 'positive' ? '+' : '-'} {factor}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const TrustScoreCard: React.FC<Props> = ({ scoreData, loading }) => {
    const score = scoreData?.totalScore ?? 0;
    const trustInfo = formatTrustScore(score);

    return (
        <SectionCard
            title="Điểm tin cậy"
            subtitle="Tín hiệu hỗ trợ quyết định duyệt/từ chối từ hệ thống."
            headerAction={
                <StatusBadge variant={scoreVariant(score)} shape="tag">
                    {trustInfo.label}
                </StatusBadge>
            }
            padded
        >
            {loading ? (
                <div className="admin-ui-muted-state">Đang tải trust score...</div>
            ) : (
                <>
                    <div className="trust-score-gauge">
                        <div
                            className="trust-score-ring"
                            style={{
                                background: `conic-gradient(var(--trust-${scoreVariant(score)}) ${score}%, #f2f0e4 0)`,
                            }}
                        >
                            <div className="trust-score-ring-inner">
                                <strong>{score}</strong>
                                <span>Điểm</span>
                            </div>
                        </div>
                    </div>

                    <div className="payout-decision-card">
                        <span>Gợi ý hệ thống</span>
                        <strong>{scoreData?.decision || 'MANUAL_REVIEW'}</strong>
                    </div>

                    <FactorList
                        title="Yếu tố tích cực"
                        factors={scoreData?.positiveFactors ?? []}
                        tone="positive"
                    />
                    <FactorList
                        title="Yếu tố rủi ro"
                        factors={scoreData?.negativeFactors ?? []}
                        tone="negative"
                    />
                </>
            )}
        </SectionCard>
    );
};

export default TrustScoreCard;
