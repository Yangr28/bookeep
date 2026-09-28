/**
 * 首次启动新手引导：
 *  - 标题 + 简介 + 功能亮点
 *  - 「加载示例数据」：写入示例流水让用户即刻体验完整功能
 *  - 「先逛逛」：保持空白，账户与分类已就绪，用户自行记账
 *
 * 用 createPortal 渲染到 document.body，z-[200] 盖过其它层级。
 */
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Wallet, TrendingUp, PieChart, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onLoadSample: () => void;
  onSkip: () => void;
}

export const OnboardingModal = ({ isOpen, onLoadSample, onSkip }: OnboardingModalProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const features = [
    { icon: BookOpen, color: 'var(--primary)', title: t('onboarding.featureRecordTitle'), desc: t('onboarding.featureRecordDesc') },
    { icon: Wallet, color: '#3B82F6', title: t('onboarding.featureAccountTitle'), desc: t('onboarding.featureAccountDesc') },
    { icon: PieChart, color: '#F59E0B', title: t('onboarding.featureStatsTitle'), desc: t('onboarding.featureStatsDesc') },
    { icon: TrendingUp, color: '#10B981', title: t('onboarding.featureBudgetTitle'), desc: t('onboarding.featureBudgetDesc') },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.6)' }}
    >
      <div
        className="card relative w-full max-w-sm mx-4 p-6 animate-bounce-in"
        style={{ background: 'var(--card-solid)' }}
      >
        <button onClick={onSkip} className="icon-btn w-9 h-9 absolute top-4 right-4" aria-label={t('onboarding.skipAria')}>
          <X size={18} />
        </button>

        <div className="text-center pt-2 pb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <BookOpen size={28} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--ink)' }}>{t('onboarding.title')}</h2>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('onboarding.subtitle')}</p>
        </div>

        <div className="space-y-3 mb-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${f.color} 18%, transparent)`, color: f.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <button
            onClick={onLoadSample}
            className="w-full py-3 rounded-button text-sm font-bold text-white active:opacity-90 transition-opacity"
            style={{ background: 'var(--primary)' }}
          >
            {t('onboarding.loadSample')}
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 rounded-button text-sm font-medium active:opacity-80 transition-opacity"
            style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
          >
            {t('onboarding.startEmpty')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
