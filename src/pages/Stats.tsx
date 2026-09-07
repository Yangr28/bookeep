import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Star, Trophy, Target, Zap, Award, TrendingUp, Wallet, Clock, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/format';

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">记账统计</h1>
            <p className="text-amber-100 text-sm mt-1">记录你的每一笔收支</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock size={14} className="text-amber-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">连续记账</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{statsData.consecutiveDays} <span className="text-sm font-normal text-gray-400">天</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Target size={14} className="text-emerald-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">累计交易</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{statsData.totalTransactions} <span className="text-sm font-normal text-gray-400">笔</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet size={14} className="text-blue-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">记账金额</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(statsData.totalAmount)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp size={14} className="text-purple-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">月均金额</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(statsData.monthlyAverage)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Calendar size={14} className="text-cyan-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">活跃天数</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{statsData.daysWithTransactions} <span className="text-sm font-normal text-gray-400">天</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <Star size={14} className="text-pink-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">使用分类</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{statsData.categoryCount} <span className="text-sm font-normal text-gray-400">个</span></p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            已获得成就 ({earnedAchievements.length}/{achievements.length})
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {earnedAchievements.map((achievement) => {
              const IconComponent = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-center"
                  title={achievement.description}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${achievement.color}20` }}
                  >
                    <IconComponent
                      size={24}
                      style={{ color: achievement.color }}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{achievement.name}</p>
                </div>
              );
            })}
            {earnedAchievements.length === 0 && (
              <div className="col-span-4 text-center py-8 text-gray-400">
                <Trophy size={48} className="mx-auto mb-3 opacity-50" />
                <p>还没有获得任何成就</p>
                <p className="text-sm">开始记账，解锁更多成就！</p>
              </div>
            )}
          </div>
        </div>

        {progressAchievements.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Target size={20} className="text-blue-500" />
              进行中
            </h3>
            <div className="space-y-3">
              {progressAchievements.map((achievement) => {
                const IconComponent = achievement.icon;
                const progress = getProgress(achievement);
                return (
                  <div
                    key={achievement.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-50"
                        style={{ backgroundColor: `${achievement.color}20` }}
                      >
                        <IconComponent
                          size={20}
                          style={{ color: achievement.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 dark:text-white">{achievement.name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
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

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700 dark:text-blue-400">记账小贴士</h3>
              <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                定期记账可以帮助您更好地了解自己的消费习惯，合理规划财务。建议每周至少记账2-3次，保持财务记录的完整性。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
