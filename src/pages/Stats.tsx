import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { ArrowLeft, Star, Trophy, Target, Zap, Award, TrendingUp, Wallet, Clock, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { toDateKey, todayKey, addDays, parseDateKey } from '../utils/date';
import Empty from '../components/Empty';

interface StatsProps {
  onBack: () => void;
}

interface Achievement {
  id: string;
  icon: typeof Star;
  color: string;
  condition: (data: StatsData) => boolean;
}

interface StatsData {
  consecutiveDays: number;
  totalTransactions: number;
  totalAmount: number;
  daysWithTransactions: number;
  firstTransactionDate: string | null;
  monthlyAverage: number;
  categoryCount: number;
}

const achievements: Achievement[] = [
  {
    id: 'first_blood',
    icon: Star,
    color: '#FBBF24',
    condition: (data) => data.totalTransactions >= 1,
  },
  {
    id: 'transactions_100',
    icon: Target,
    color: '#10B981',
    condition: (data) => data.totalTransactions >= 100,
  },
  {
    id: 'transactions_1000',
    icon: Award,
    color: '#06B6D4',
    condition: (data) => data.totalTransactions >= 1000,
  },
  {
    id: 'amount_10000',
    icon: Zap,
    color: '#84CC16',
    condition: (data) => data.totalAmount >= 10000,
  },
  {
    id: 'amount_100000',
    icon: Trophy,
    color: '#F59E0B',
    condition: (data) => data.totalAmount >= 100000,
  },
  {
    id: 'active_days_30',
    icon: Calendar,
    color: '#3B82F6',
    condition: (data) => data.daysWithTransactions >= 30,
  },
  {
    id: 'active_days_100',
    icon: Trophy,
    color: '#D946EF',
    condition: (data) => data.daysWithTransactions >= 100,
  },
];

// 成就描述插值参数（名称/描述文案在 i18n 分片 stats.achievements.<id> 中）
const achievementParams: Record<string, Record<string, number> | undefined> = {
  transactions_100: { count: 100 },
  transactions_1000: { count: 1000 },
  amount_10000: { amount: 10000 },
  amount_100000: { amount: 100000 },
  active_days_30: { count: 30 },
  active_days_100: { count: 100 },
};

export const Stats = ({ onBack }: StatsProps) => {
  const { t } = useTranslation();
  const transactions = useStore((state) => state.transactions);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const statsData = useMemo((): StatsData => {
    if (transactions.length === 0) {
      return {
        consecutiveDays: 0,
        totalTransactions: 0,
        totalAmount: 0,
        daysWithTransactions: 0,
        firstTransactionDate: null,
        monthlyAverage: 0,
        categoryCount: 0,
      };
    }

    const dates = new Set(
      transactions.map((t) => toDateKey(new Date(t.createdAt)))
    );

    const sortedDates = Array.from(dates).sort();
    const firstDate = sortedDates[0];

    let consecutiveDays = 0;
    // 连续记账天数:今天有账则从今天起算,否则允许从昨天起算(今天还没记不算断签)
    const today = todayKey();
    let cursor = new Date();

    while (true) {
      const dateStr = toDateKey(cursor);
      if (dates.has(dateStr)) {
        consecutiveDays++;
        cursor = addDays(cursor, -1);
      } else if (dateStr === today) {
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categories = new Set(transactions.map((t) => t.categoryId));

    if (firstDate) {
      const first = parseDateKey(firstDate);
      const now = new Date();
      const months = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth();
      const monthlyAverage = months > 0 ? Math.round(totalAmount / months) : totalAmount;

      return {
        consecutiveDays,
        totalTransactions: transactions.length,
        totalAmount,
        daysWithTransactions: dates.size,
        firstTransactionDate: firstDate,
        monthlyAverage,
        categoryCount: categories.size,
      };
    }

    return {
      consecutiveDays,
      totalTransactions: transactions.length,
      totalAmount,
      daysWithTransactions: dates.size,
      firstTransactionDate: firstDate,
      monthlyAverage: totalAmount,
      categoryCount: categories.size,
    };
  }, [transactions]);

  const getAchievementName = (achievement: Achievement): string =>
    t(`stats.achievements.${achievement.id}.name`);

  const getAchievementDescription = (achievement: Achievement): string =>
    t(`stats.achievements.${achievement.id}.description`, achievementParams[achievement.id]);

  const earnedAchievements = achievements.filter((a) => a.condition(statsData));
  const progressAchievements = achievements
    .filter((a) => !a.condition(statsData))
    .slice(0, 4);

  const getProgress = (achievement: Achievement): number => {
    switch (achievement.id) {
      case 'transactions_100':
        return Math.min((statsData.totalTransactions / 100) * 100, 100);
      case 'transactions_1000':
        return Math.min((statsData.totalTransactions / 1000) * 100, 100);
      case 'amount_10000':
        return Math.min((statsData.totalAmount / 10000) * 100, 100);
      case 'amount_100000':
        return Math.min((statsData.totalAmount / 100000) * 100, 100);
      case 'active_days_30':
        return Math.min((statsData.daysWithTransactions / 30) * 100, 100);
      case 'active_days_100':
        return Math.min((statsData.daysWithTransactions / 100) * 100, 100);
      default:
        return 0;
    }
  };

  const statCards = [
    { icon: Clock, label: t('stats.cards.streak'), value: statsData.consecutiveDays, unit: t('stats.units.day', { count: statsData.consecutiveDays }), color: '#d9930f' },
    { icon: Target, label: t('stats.cards.totalTransactions'), value: statsData.totalTransactions, unit: t('stats.units.entry', { count: statsData.totalTransactions }), color: 'var(--primary)', soft: true },
    { icon: Wallet, label: t('stats.cards.totalAmount'), value: formatCurrency(statsData.totalAmount), unit: '', color: '#7c6ef0' },
    { icon: TrendingUp, label: t('stats.cards.monthlyAverage'), value: formatCurrency(statsData.monthlyAverage), unit: '', color: '#14b8a6' },
    { icon: Calendar, label: t('stats.cards.activeDays'), value: statsData.daysWithTransactions, unit: t('stats.units.day', { count: statsData.daysWithTransactions }), color: '#06b6d4' },
    { icon: Star, label: t('stats.cards.categoryCount'), value: statsData.categoryCount, unit: t('stats.units.category', { count: statsData.categoryCount }), color: '#ec4899' },
  ];

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn" aria-label={t('stats.back')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{t('stats.title')}</h1>
          <p className="page-subtitle">{t('stats.subtitle')}</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* 数据概览 */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div key={card.label} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded-button flex items-center justify-center"
                    style={
                      'soft' in card && card.soft
                        ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                        : { background: `${card.color}1f`, color: card.color }
                    }
                  >
                    <IconComponent size={14} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{card.label}</p>
                </div>
                <p className="text-2xl font-bold amount-num" style={{ color: 'var(--ink)' }}>
                  {card.value}
                  {card.unit && <span className="text-sm font-normal" style={{ color: 'var(--ink-2)' }}> {card.unit}</span>}
                </p>
              </div>
            );
          })}
        </div>

        {/* 已获得成就 */}
        <div className="mt-6">
          <h3 className="section-title flex items-center gap-2">
            <Trophy size={18} style={{ color: '#d9930f' }} />
            {t('stats.achievementsTitle', { earned: earnedAchievements.length, total: achievements.length })}
          </h3>
          {earnedAchievements.length === 0 ? (
            <Empty
              icon={Trophy}
              title={t('stats.emptyTitle')}
              description={t('stats.emptyDescription')}
            />
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {earnedAchievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className="card p-3 text-center card-hover"
                    title={getAchievementDescription(achievement)}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: `${achievement.color}30` }}
                    >
                      <IconComponent
                        size={24}
                        style={{ color: achievement.color }}
                      />
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{getAchievementName(achievement)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 进行中成就 */}
        {progressAchievements.length > 0 && (
          <div className="mt-6">
            <h3 className="section-title flex items-center gap-2">
              <Target size={18} style={{ color: 'var(--primary)' }} />
              {t('stats.inProgress')}
            </h3>
            <div className="space-y-3">
              {progressAchievements.map((achievement) => {
                const IconComponent = achievement.icon;
                const progress = getProgress(achievement);
                return (
                  <div key={achievement.id} className="card p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-50 flex-shrink-0"
                        style={{ backgroundColor: `${achievement.color}30` }}
                      >
                        <IconComponent
                          size={20}
                          style={{ color: achievement.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium" style={{ color: 'var(--ink)' }}>{getAchievementName(achievement)}</span>
                          <span className="text-sm amount-num flex-shrink-0 ml-2" style={{ color: 'var(--ink-2)' }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'var(--paper-deep)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: achievement.color }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 小贴士 */}
        <div className="card p-4 mt-6">
          <div className="flex items-start gap-3">
            <Zap size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--ink)' }}>{t('stats.tipTitle')}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
                {t('stats.tipBody')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
