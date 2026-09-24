/**
 * 骨架屏组件族：
 *  - SkeletonBlock：任意形状占位块（圆角/尺寸由 className 控制）
 *  - ListSkeleton：流水/列表行（图标圆 + 两行文字），rows 控制行数
 *  - CardSkeleton：卡片内容（标题行 + 多行短条）
 *
 * 一律使用 .skeleton 令牌类（浅/深双套底色与扫光），不内联色值；
 * 动效随 prefers-reduced-motion 自动关停（见 index.css）。
 */
import { cn } from '@/lib/utils';
import i18n from '../i18n';

interface SkeletonBlockProps {
  className?: string;
  /** 无障碍标签；装饰性占位可留空 */
  label?: string;
}

export function SkeletonBlock({ className, label }: SkeletonBlockProps) {
  return (
    <div
      className={cn('skeleton', className)}
      role="status"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

interface ListSkeletonProps {
  rows?: number;
  className?: string;
}

/** 列表行骨架：左圆形图标 + 右两行文字，行间沿用列表间距 */
export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-label={i18n.t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="list-item">
          <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2 py-0.5">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-2.5 w-2/3" />
          </div>
          <SkeletonBlock className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  /** 正文短条行数 */
  lines?: number;
  className?: string;
}

/** 卡片骨架：顶部标题条 + 若干宽度递减的正文短条 */
export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn('card p-4 flex flex-col gap-3', className)} role="status" aria-label={i18n.t('common.loading')}>
      <SkeletonBlock className="h-4 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-1/3' : i % 2 === 0 ? 'w-full' : 'w-4/5')}
        />
      ))}
    </div>
  );
}

export default SkeletonBlock;
