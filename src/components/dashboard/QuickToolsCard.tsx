import { useTranslation } from 'react-i18next';
import { Zap, LucideIcon } from 'lucide-react';
import { RecordTemplate } from '../../types';
import { formatCurrencyShort } from '../../utils/format';
import { getIcon } from '../../utils/iconMap';

interface QuickTool {
  icon: LucideIcon;
  labelKey: string;
  onClick: () => void;
  color: string;
  bg: string;
}

interface QuickToolsCardProps {
  tools: QuickTool[];
  layout?: '1x4' | '2x2';
  /** 常用模板（最多展示前 6 个），存在时在工具下方加一键入账行 */
  templates?: RecordTemplate[];
  /** 模板一键入账 */
  onQuickTemplate?: (template: RecordTemplate) => void;
}

/** 快捷工具：支持 1×4（默认）或 2×2 布局；下方可选模板一键入账行 */
export const QuickToolsCard = ({ tools, layout = '1x4', templates, onQuickTemplate }: QuickToolsCardProps) => {
  const { t } = useTranslation();
  const cols = layout === '2x2' ? 'grid-cols-2' : 'grid-cols-4';
  const quickTemplates = templates?.slice(0, 6) ?? [];
  const showTemplates = quickTemplates.length > 0 && !!onQuickTemplate;

  return (
    <div className="px-4 mt-3">
      <div className="card p-2">
        <div className={`grid ${cols} gap-1`}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.labelKey}
                onClick={tool.onClick}
                className="flex flex-col items-center gap-1 py-1.5 rounded-button transition-colors active:scale-95 min-w-0"
              >
                <div className="w-9 h-9 rounded-button flex items-center justify-center" style={{ background: tool.bg }}>
                  <Icon size={18} style={{ color: tool.color }} />
                </div>
                <span className="text-xs font-medium w-full text-center truncate" style={{ color: 'var(--ink)' }}>{t(tool.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {showTemplates && (
          <>
            <div className="mt-2 pt-2 px-1" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex items-center gap-1 mb-1.5">
                <Zap size={12} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>
                  {t('dashboard.quickTemplates')}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {quickTemplates.map((template) => {
                  const TemplateIcon = getIcon(template.icon);
                  return (
                    <button
                      key={template.id}
                      onClick={() => onQuickTemplate?.(template)}
                      className="flex-shrink-0 flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full active:scale-95 transition-transform min-w-0"
                      style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${template.color}30`, color: template.color }}
                      >
                        <TemplateIcon size={13} />
                      </span>
                      <span className="text-xs font-medium truncate max-w-[96px]" style={{ color: 'var(--ink)' }}>
                        {template.name}
                      </span>
                      <span className="text-xs font-semibold amount-num flex-shrink-0" style={{ color: template.type === 'income' ? 'var(--primary)' : 'var(--expense)' }}>
                        {template.type === 'income' ? '+' : '-'}{formatCurrencyShort(template.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
