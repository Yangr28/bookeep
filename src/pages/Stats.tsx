import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Star, Trophy, Target, Zap, Award, TrendingUp, Wallet, Clock, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import Empty from '../components/Empty';

interface StatsProps {
  onBack: () => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
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
    name: '初尝记账',
    description: '记录第一笔交易',
    icon: Star,
    color: '#FBBF24',
    condition: (data) => data.totalTransactions >= 1,
  },
  {
    id: 'transactions_100',
    name: '百笔记录',
    description: '累计记录100笔交易',
    icon: Target,
    color: '#10B981',
    condition: (data) => data.totalTransactions >= 100,
  },
  {
    id: 'transactions_1000',
    name: '千笔大师',
    description: '累计记录1000笔交易',
    icon: Award,
    color: '#06B6D4',
    condition: (data) => data.totalTransactions >= 1000,
  },
  {
    id: 'amount_10000',
    name: '万元户',
    description: '累计记账金额超过1万元',
    icon: Zap,
    color: '#84CC16',
    condition: (data) => data.totalAmount >= 10000,
  },
  {
    id: 'amount_100000',
    name: '十万富翁',
    description: '累计记账金额超过10万元',
    icon: Trophy,
    color: '#F59E0B',
    condition: (data) => data.totalAmount >= 100000,
  },
  {
    id: 'active_days_30',
    name: '月度活跃',
    description: '累计活跃30天',
    icon: Calendar,
    color: '#3B82F6',
    condition: (data) => data.daysWithTransactions >= 30,
  },
  {
    id: 'active_days_100',
    name: '百日活跃',
    description: '累计活跃100天',
    icon: Trophy,
    color: '#D946EF',
    condition: (data) => data.daysWithTransactions >= 100,
  },
];

export const Stats = ({ onBack }: StatsProps) => {
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
      transactions.map((t) => new Date(t.createdAt).toISOString().slice(0, 10))
    );

    const sortedDates = Array.from(dates).sort();
    const firstDate = sortedDates[0];

    let consecutiveDays = 0;
    const currentDate = new Date();

    while (true) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      if (dates.has(dateStr)) {
        consecutiveDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (dateStr === new Date().toISOString().slice(0, 10)) {
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categories = new Set(transactions.map((t) => t.categoryId));

    if (firstDate) {
      const first = new Date(firstDate);
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
    { icon: Clock, label: '连续记账', value: statsData.consecutiveDays, unit: '天', color: '#d9930f' },
    { icon: Target, label: '累计交易', value: statsData.totalTransactions, unit: '笔', color: 'var(--primary)', soft: true },
    { icon: Wallet, label: '记账金额', value: formatCurrency(statsData.totalAmount), unit: '', color: '#7c6ef0' },
    { icon: TrendingUp, label: '月均金额', value: formatCurrency(statsData.monthlyAverage), unit: '', color: '#14b8a6' },
    { icon: Calendar, label: '活跃天数', value: statsData.daysWithTransactions, unit: '天', color: '#06b6d4' },
    { icon: Star, label: '使用分类', value: statsData.categoryCount, unit: '个', color: '#ec4899' },
  ];

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <button onClick={onBack} className="icon-btn" aria-label="返回">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">记账统计</h1>
          <p className="page-subtitle">记录你的每一笔收支</p>
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
            已获得成就 ({earnedAchievements.length}/{achievements.length})
          </h3>
          {earnedAchievements.length === 0 ? (
            <Empty
              icon={Trophy}
              title="还没有获得任何成就"
              description="开始记账，解锁更多成就！"
            />
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {earnedAchievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className="card p-3 text-center card-hover"
                    title={achievement.description}
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
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{achievement.name}</p>
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
              进行中
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
                          <span className="font-medium" style={{ color: 'var(--ink)' }}>{achievement.name}</span>
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
              <h3 className="font-medium" style={{ color: 'var(--ink)' }}>记账小贴士</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
                定期记账可以帮助您更好地了解自己的消费习惯，合理规划财务。建议每周至少记账2-3次，保持财务记录的完整性。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
