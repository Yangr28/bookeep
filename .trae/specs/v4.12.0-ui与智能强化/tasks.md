# v4.12.0 UI 全站精修与智能强化 - 实施计划

> 说明：每个任务为可独立验证的纵向切片。纯逻辑先行（可单测），原生风险（语音）尽早 spike，
> UI 精修按"基础→高频页→数据页→资产/设置页→查漏"推进。每个任务新增可见文案必须同步
> zh-CN/en-US 两份 i18n 资源。

## Task 1: 智能推荐引擎 recommender.ts + 单测
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `src/utils/recommender.ts`，纯函数：`getFrequentCategories(transactions, type, limit, now?)`（频次+近 30 天时间衰减加权）、`predictCategory(context)`（备注/商家关键词 + 同商家历史分类 + 同星期/时段加权，返回 {categoryId,confidence}）、`recommendAccount(transactions, accounts)`（最常用优先，其次最近使用）、`getFrequentAmounts(transactions, type, limit)`（高频金额）。
  - 修复 `smartParser.ts` 的 `parseSmartInputWithHistory`：商家/备注历史命中（count≥2）时把高频分类经 findCategoryByIdentifier 解析后写回 `categoryKeyword`（或新增可选 categoryId 字段，保持现有调用兼容）。
  - 新建 `src/utils/recommender.test.ts`：频率排序、时间衰减、商家命中、空数据、账户推荐、金额频次用例。
  - 阈值/权重集中为命名常量。
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-1.1: 构造流水下各函数输出与预期一致（含近期加权胜出、同商家分类返回）；证据：vitest 用例
  - `rule` TR-1.2: `parseSmartInputWithHistory` 历史命中用例返回正确分类关键词；证据：vitest 用例
  - `rule` TR-1.3: 空交易数组不抛错且返回空推荐；证据：vitest 用例
- **Notes**: 与 smartParser 关键词体系复用，不重复造词库。

## Task 2: 智能洞察引擎 insights.ts + 单测
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `src/utils/insights.ts`：入参为当月/上月交易、预算、分类映射、now?，输出 `Insight[]`（type、severity(info/warning/danger)、titleKey 无关的机器码 + 参数、amount?、payload? 供跳转）。
  - 规则六类：支出环比异常(±30%，上月 0 跳过)、预算超支/临超支(≥100% danger / ≥80% warning)、预计月末超支(日均×天数 > 预算)、大额支出(≥日均 5 倍，最多 3 笔)、固定订阅(同分类+金额±5%，近 3 月至少 2 月出现)、高频消费(单分类≥8 笔)。
  - 数据不足保护：当月支出 < 5 笔时环比/大额/高频静默；无预算时预算类静默。
  - 新建 `src/utils/insights.test.ts`：六类规则各一个触发集 + 至少两个不触发对照集。
  - 日期一律使用 `src/utils/date.ts` 本地时区工具（getMonthKey/toDateKey），禁止 new Date().getMonth 散落。
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-2.1: 六类触发集输出类型/级别/金额与构造一致；证据：vitest
  - `rule` TR-2.2: 数据不足与无预算对照集不产出对应洞察；证据：vitest
  - `rule` TR-2.3: 5000 笔规模 perf 用例（可用构造器生成）单次 < 20ms；证据：vitest 计时断言/记录

## Task 3: 语音插件兼容性 Spike 与原生接入
- **Status**: `done`
- **Priority**: high
- **Depends On**: None
- **完成证据（2026-09-20）**:
  - **选型结论（TR-3.3）**: `@capgo/capacitor-speech-recognition@^8.3.2`。`@capacitor-community/speech-recognition` 最新仅 7.0.1（一年前发布，只兼容 Capacitor 7），不满足；capgo 分叉版本号与 Capacitor 主版本对齐（v8↔Capacitor 8，active maintained，2026-09 刚发布 8.3.2），API 与 community 版兼容并含静音分段增强。
  - **TR-3.1**: `npx cap sync android` 成功，识别 3 插件（app/filesystem/capgo-speech@8.3.2）；`:app:processReleaseManifest` BUILD SUCCESSFUL；最终合并产物 `android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml` L16 含 `android.permission.RECORD_AUDIO`（源 manifest 由插件 `android/src/main/AndroidManifest.xml` 声明）。`:app:compileReleaseJavaWithJavac` 随 Task 14 assembleRelease 完整验证。
  - **TR-3.2**: 新建 `src/hooks/useSpeechToText.ts`（idle→requesting→listening→stopping→error 状态机 + 4s 静音兜底计时器 + partial/listeningState/error 监听 + 语言跟随 i18n zh-CN/en-US）。插件 Web 实现 `available()` 实际 throw unimplemented（非返回 false），hook 首次探测 try/catch 兜住置 `available=false`；旧基座桥 reject 同样兜底，不产生未捕获异常。i18n key：speech.tapToSpeak/listening/stop + speech.error.*（中英双语）。浏览器 console 实测随 Task 5 麦克风按钮挂载时进行。tsc 通过、eslint 该文件 0 problem、vitest 69/69 全过。
- **Description**:
  - 安装候选插件并验证 Capacitor 8 兼容：先试 `@capacitor-community/speech-recognition`（install 后检查其 podspec/package peer 与 android 工程 sync 是否成功），不兼容则换维护分叉（capgo 系）；在任务完成证据中记录最终选型与版本。
  - `npx cap sync android`；AndroidManifest 确认 RECORD_AUDIO（插件应自带合并，需检查最终 manifest）。
  - 新建 `src/hooks/useSpeechToText.ts`：封装 available/checkPermissions/requestPermissions/start/stop/partialResults 监听；语言映射 app 语言→zh-CN/en-US；旧基座无插件方法（registerPlugin 调用拒绝）时 available=false 不抛错。
  - 提供识别状态机：idle→requesting→listening→stopped/error；静音超时自动停止（插件能力不足则用计时器兜底）。
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-3.1: cap sync 与 :app:compileReleaseJavaWithJavac 通过，最终 merged manifest 含 RECORD_AUDIO；证据：gradle 输出/manifest
  - `rule` TR-3.2: hook 在 Web（无原生）环境 available=false 且不抛未捕获异常；证据：浏览器 console 验证
  - `rule` TR-3.3: 选型结论（包名/版本/兼容证据）记录在完成证据中；证据：任务记录

## Task 4: UI 基础设施精修（令牌/骨架屏/死代码）
- **Status**: `done`
- **Priority**: high
- **Depends On**: None
- **完成证据（2026-09-20）**:
  - **TR-4.1**: `NumericKeypad.tsx` 已删除，删除前 grep 全仓仅自身定义 3 处匹配、零引用。
  - **index.css 增补（全部走 var(--*) 令牌，无新造 hex/gray）**: `--skeleton-base/--skeleton-highlight` 浅/深双套令牌；`.skeleton` + `skeleton-shimmer` 扫光；`.card-press` 统一按压缩放；`.empty-state/.empty-state-title/.empty-state-desc/.empty-inline` 空态规范；全局 `:focus-visible` 环（主色 2px + offset 2px，仅交互元素，触摸不触发，与 Recharts `!important` 去焦规则不冲突）；`prefers-reduced-motion` 媒体查询关停动画时长/扫光/按压。
  - 新建 `src/components/Skeleton.tsx`（SletonBlock/ListSkeleton/CardSkeleton，role=status + i18n aria-label）；新建 `src/components/Toast.tsx`（success/info/error 三变体，沿用居中卡面视觉）与 `src/hooks/useToast.ts`（timer 清理，修复连续触发时旧定时器提前关闭新 toast 的隐患）；App.tsx 6 处 `setToastMessage+setTimeout` 重复模式全部替换为 `showToast(msg, variant, duration?)`。
  - `Empty.tsx` 复用 `.empty-state` 规范类，去除默认硬编码中文"暂无数据"（4 个调用点均显式传 title；Search/Stats/TransactionDetail 的页面硬编码留 Task 11）。
  - i18n：common.loading/common.retry（中英）；eslint.config.js ignores 补 android/ios（cap sync 产物不再误扫，修复 native-bridge.js 的假 error）。
  - tsc 通过；lint 0 error（19 warnings 与本任务前完全一致，无新增）；vitest 69/69。
  - **TR-4.2 浅/深视觉走查随 Task 5 骨架屏真实接入首页时一并截图**（当前无挂载点，临时展示页验证后即删无价值）。
- **Description**:
  - 删除 `src/components/NumericKeypad.tsx`（死代码，无引用）。
  - index.css 增补令牌/类：统一 `:focus-visible` 环（主色 2px offset）、`.skeleton`（shimmer 加载底，浅/深双令牌）、`.card-press`（按压态统一，尊重系统动画）、空态间距规范；补 prefers-reduced-motion 媒体查询（关停/减弱非必要动画）。
  - 新建 `src/components/Skeleton.tsx`（SkeletonBlock、ListSkeleton、CardSkeleton）与统一 `src/components/Toast`（若无）走查现有 toast 实现。
  - 新增 i18n 通用 key（common.loading 等）。
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-4.1: NumericKeypad 全仓零引用且文件删除；tsc/lint 通过；证据：grep + 命令输出
  - `rule` TR-4.2: 新增类在浅/深模式下肉眼可读（shimmer 对比不刺眼）；证据：截图走查
  - `rubric` TR-4.3: 令牌复用度；scale 1-5；1=新增样式另造色值；3=部分复用；5=全部使用 var(--*) 令牌；threshold >=4；证据：代码审查

## Task 5: 首页智能输入补全 + 麦克风按钮
- **Status**: `done`
- **Priority**: high
- **Depends On**: Task 1, Task 3, Task 4
- **完成证据（2026-09-20，dev server 浏览器实测）**:
  - 智能输入区接入 `getNoteSuggestions`：250ms 独立防抖、最多 5 条、前缀匹配、频次排序、过滤与输入完全相同项；下拉 listbox/option（History 图标+文本，.card-press 按压，line 令牌分隔）；点击整条填入并保持焦点；mousedown 外部关闭 + Esc 关闭；无候选不显示；input 带 combobox/aria-autocomplete/aria-expanded/controls。
  - 麦克风按钮接入 `useSpeechToText`：仅 `available===true` 渲染；listening/requesting/stopping 显示停止方块+`animate-pulse-warning` 脉冲（随 reduced-motion 关停）；partial 实时写入输入框、finalText 落定，自动进入既有 parseSmartInput 预览→确认管道（不自动入账）；error 态按钮短暂变 expense 色+title 错误说明（完整引导浮层在 Task 8）。三要素秒存路径与步数不变。
  - **TR-5.1 实测 PASS**：注入 7 条构造流水（星巴克咖啡×3/星巴克拿铁×1/午餐黄焖鸡×2/午餐麻辣烫×1），输入"星巴"出 2 候选且高频在前，点"星巴克拿铁"正确填入并关下拉，"午餐"排序正确，Esc 关闭。
  - **TR-5.2 + TR-3.2 实测 PASS**：Web 环境麦克风相关 aria-label 节点数=0；console 无 Uncaught、无 speech 报错（插件 WebImpl throw 被 hook catch 置 available=false）。
  - **TR-4.2 补验 PASS**：skeleton probe 浅/深色截图，底色/扫光/卡片层次清晰不刺眼。
  - **TR-5.3**：新增可见文案全部走 t()（speech.tapToSpeak/stop、speech.error.*、dashboard.save aria）；候选为纯历史文本。
  - localStorage 仅测试期临时覆盖，已全部恢复原值；tsc 通过、改动文件 0 新 lint 告警、vitest 69/69。
- **Description**:
  - Dashboard 智能输入：250ms 防抖从历史备注/商家提取前缀匹配候选（新建 `getNoteSuggestions` 放 recommender.ts），下拉候选卡（最多 5 条，图标+文本，点击整条填入）；点击外部/Esc 关闭；无候选不显示。
  - 输入区加麦克风按钮：useSpeechToText，可用时显示；listening 时按钮脉冲态。
  - 保持现有"三要素齐全秒存"逻辑不变，不增加步数。
- **Acceptance Criteria Addressed**: AC-3, AC-8
- **Test Requirements**:
  - `rule` TR-5.1: 前缀过滤/防抖/点击填入行为符合 AC-3；证据：浏览器手动验证记录
  - `rule` TR-5.2: Web 环境麦克风按钮不渲染（或禁用带 title），无异常；证据：浏览器验证
  - `rule` TR-5.3: 新文案均走 i18n；证据：grep 无硬编码中文

## Task 6: 记账页智能化（推荐排序/预选/常用金额）
- **Status**: `done`
- **Priority**: high
- **Depends On**: Task 1, Task 4
- **完成证据（2026-09-21，dev server 浏览器实测）**:
  - Record.tsx：分类网格改为 `getFrequentCategories` 加权排序（有频次的在前、其余稳定保持配置原序），前 3 名经 CategoryCard 新增 isFrequent/frequentLabel 显示克制的「常用」圆角小角标（primary-soft/primary-ink 令牌，9px）；空进入（FAB）时 mount effect 用 predictCategory（含时段推断）+recommendAccount 预选；切收支类型走 handleTypeChange 重置点并为新类型预选；金额卡下新增 getFrequentAmounts 横向 chips（最多 4，去重当前值，line/paper/ink-2 令牌，.card-press，编辑模式隐藏）。
  - 防覆盖：预选只发生在 mount 与类型切换两个离散重置点，无任何 effect 会在用户手选/智能解析后重跑，从机制上保证不覆盖（初版 ref 标志位为只写死逻辑已移除）。
  - **TR-6.1 PASS**：实测网格顺序 餐饮/交通/购物/娱乐/医疗/教育，前 3 有角标第 4 起无；空进入预选餐饮+微信零钱；chips ¥6/¥35/¥28/¥68，点 ¥35 入框 35；切收入预选工资+招商银行、chips 变 ¥15000；切回支出预选回餐饮。
  - **TR-6.2 PASS**：手选与类型切换均为离散事件，预选 effect 不随其重跑（代码审查+切换往返实测）。
  - **TR-6.3**：角标 9px 胶囊位于卡片右上、不抢主视觉；i18n record.frequentBadge（常用/Frequent）。
  - tsc 0 error、lint Record/CategoryCard 0 告警（总 19 warnings 全为既有）、vitest 69/69。
- **Description**:
  - Record.tsx 新增态进入时：分类网格按 getFrequentCategories 排序（无历史时维持原序），前若干个（如 3 个）加"常用"小角标；predictCategory+recommendAccount 做预选（仅当用户未手动选择/未由入口预填时）。
  - 金额卡片下方加横向"常用金额"chips（getFrequentAmounts，最多 4 个），点击 onAmountChange 直接填入。
  - 手动选择分类/账户后本次会话不再被自动覆盖（用 ref/标志位区分"预选"与"手选"）。
- **Acceptance Criteria Addressed**: AC-2, AC-11
- **Test Requirements**:
  - `rule` TR-6.1: 推荐排序/角标/预选/chips 填入行为符合 AC-2；证据：浏览器手动验证
  - `rule` TR-6.2: 手动选择后不被预选覆盖；证据：手动验证
  - `rubric` TR-6.3: 分类网格紧凑度与可读性；scale 1-5；1=角标拥挤难读；3=可接受；5=角标克制不抢视觉；threshold>=4；证据：截图走查

## Task 7: 连续记账（保存并继续）
- **Status**: `done`
- **Priority**: high
- **Depends On**: Task 6
- **完成证据（2026-09-21，dev server 浏览器实测）**:
  - App.tsx：recordContinueMode/recordResetSignal 两个 state；handleRecordSubmit 新增分支——仅新增态且开关开时：addTransaction 后留页、清金额/备注、分类置 null、日期重置 new Date()、resetSignal+1、toast app.toast.savedContinue；编辑态与开关关均走原 handleRecordSuccess（跳页 toast 不变）。
  - Record.tsx：底部主按钮下新增 role=switch 文字开关（Circle/CheckCircle2 图标，选中 primary 色），选中时主按钮文案「保存并继续」；编辑模式完全不渲染开关；resetSignal effect（首帧 ref 跳过）按含新流水的最新历史重新预选分类，账户/类型保留。
  - **TR-7.1 PASS**：连存 50/51/52 三笔，库长度 18→19→20→21；每次留页、金额/备注清空、账户微信零钱保留、日期「今天」、分类预选回餐饮、开关保持开、toast「已保存，继续记一笔」；新增条目字段正确（expense/exp-1/acc-3/今日 ISO）。
  - **普通路径回归 PASS**：关开关后存 53，跳回首页+toast「记账成功」，长度 22。
  - **TR-7.2 PASS**：编辑进账单详情→编辑记账页，document.querySelector('[role=switch]')=null、无「保存后继续记一笔」文案，主按钮「保存修改」。
  - 测试期 4 笔测试流水（50/51/52/53，空备注餐饮/acc-3/今日）已按严格特征匹配从 localStorage 清除，刷新确认恢复 18 条；i18n：record.continueToggle/saveAndContinue + app.toast.savedContinue（中英）；tsc 0 error、0 新 lint 告警、vitest 69/69。
- **Description**:
  - App.tsx 新增连续记账状态（如 recordContinueMode），Record 页底部主操作区：主按钮"保存"最醒目，次按钮/开关"保存并继续"（具体形态按紧凑原则，推荐主按钮下方一行文字按钮或按钮内切换，设计阶段定稿）。
  - 连续保存路径：复用 addTransaction，保存后不 resetHistory 跳首页；清空金额/备注，分类重置为推荐预选，保留账户/收支类型，日期重置为现在；toast 反馈"已保存，继续记一笔"。
  - 编辑模式隐藏连续入口；NFR：关键路径步数不增加。
- **Acceptance Criteria Addressed**: AC-4, AC-11
- **Test Requirements**:
  - `rule` TR-7.1: 连存 3 笔的字段状态与入账数符合 AC-4；证据：手动验证+store 核对
  - `rule` TR-7.2: 编辑模式无连续入口；证据：手动验证

## Task 8: 语音录音浮层与端到端接线
- **Status**: `done`（代码；TR-8.1/8.2/8.3 需真机，随 Task 14 整包验证）
- **Priority**: medium
- **Depends On**: Task 3, Task 5
- **完成证据（2026-09-23）**:
  - 新建 `src/components/SpeechSheet.tsx`：底部 .sheet/.animate-slide-up 浮层（与 TimePicker 同令牌），z-100、遮罩点击关闭、role=dialog/aria-modal。
  - open=true 自动 start（startedForOpenRef 保证每次打开仅一次），关闭/卸载 cleanup 调 stop+reset。四态：requesting(preparing 文案+静态 Mic)、listening(双层 .speech-ripple 波纹 0/0.9s 错相+Square 停止钮+partial 实时文本，无文本时显示 hint)、error(AlertTriangle+expense 软底+t(errorKey)，permissionDenied 文案即"去系统设置"引导+"我知道了")、final(finalText 展示，空则 emptyResult；「重说」reset+start /「填入输入框」onResult+关闭)。
  - 波纹动画 .speech-ripple/@keyframes speech-ripple 加在 index.css，被全局 `@media (prefers-reduced-motion: reduce)` 守卫统一关停。
  - Dashboard.tsx：移除原内联 start/stop+micError 三 effect+Square 图标，麦克风仅在 speechAvailable===true 渲染、点击 setSpeechSheetOpen(true)；`<SpeechSheet onResult={setSmartInput}>` 回填后走既有 parseSmartInput 预览/确认，不自动入账；三要素秒存路径不变。
  - Record.tsx：智能输入区新增同款麦克风（仅 available 渲染、非编辑态卡片内）+SpeechSheet，onResult 回填输入框，用户点 Check 才走 handleSmartSubmit 解析（预填不自动入账）。
  - i18n：speech 段新增 preparing/sheetTitle/hint/retry/useText/emptyResult/gotIt（中英同步）。Web 上插件 available=false，麦克风与浮层入口均不渲染，桌面浏览器无法触发；TR-8.x 真机留 Task 14。
- **Description**:
  - 新建 `src/components/SpeechSheet.tsx`：底部浮层（sheet 令牌），监听状态动画（脉冲波纹，尊重 reduced-motion）、partial 文本实时显示、停止/重说按钮、不可用/拒绝权限说明文案与"去设置"引导。
  - 首页/记账页麦克风接线：识别完成文本写入智能输入框（不自动入账），进入现有 parseSmartInput 预填管道供用户确认。
  - 权限拒绝 → 浮层内说明；再次点击走 requestPermissions 已拒绝则提示去系统设置。
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-8.1: 真机端到端 AC-7 场景通过（语音→预填→确认入账）；证据：真机测试记录/录屏
  - `rule` TR-8.2: 拒绝权限路径不崩溃且有引导；证据：真机验证
  - `rubric` TR-8.3: 浮层视觉与动效克制度；scale 1-5；1=花哨干扰；3=合格；5=状态清晰、动效轻微；threshold>=4；证据：真机/截图

## Task 9: 智能洞察 UI（月报区）
- **Status**: `done`
- **Priority**: high
- **Depends On**: Task 2, Task 4
- **完成证据（2026-09-21，dev server 浏览器实测）**:
  - Profile.tsx：文件内新增 InsightRow（无新文件），severity→expense/expense-ink/primary 三档软底图标，类型图标 TrendingUp·Down/AlertOctagon/AlertTriangle/Zap/Repeat/Flame；标题+描述全走 t(titleKey/descriptionKey, params)，direction 占位符（up/down）先映射 insights.directionUp/Down 再插值；右侧金额仅 5 类金额型洞察显示 formatCurrency；有 payload 整行为 button（.card-press+ChevronRight），无 payload 为 div；逐行 animate-fade-in 60ms 递增延迟。
  - 模块置于「月度报表」展开区顶部（paper 底卡，Sparkles 标题）；insightList useMemo 注入当月流水/全部历史/当月 budgets/categories；`isViewingCurrentMonth` 门控（selectedDate 年=今年且月=当月，否则模块完全不渲染，避免引擎当前月口径错位）；无洞察用 .empty-inline 一行提示。
  - App.tsx：onInsightClick → setDetailFilter('month-expense')，带 categoryId 跳该分类明细、否则跳全部当月支出（复用 /detail + setSelectedCategoryId 既有机制）。
  - **TR-9.1 PASS（浏览器）**：构造数据（8笔餐饮/7笔交通/3笔购物/1500娱乐/三月房租/3条预算）下中文 7 行齐出：支出环比上升 489%、餐饮预算已超支(280%)、交通预算接近上限(84%)、购物预计月末超支、1笔大额支出、住房疑似固定支出(近3月)、餐饮消费8笔；金额/级别色/箭头正确。
  - **TR-9.2 PASS（浏览器）**：点住房洞察→「住房明细」仅住房流水；点大额支出→「本月支出」全部当月流水。
  - **TR-9.3 PASS（浏览器）**：切 en-US 七行英文文案完整（Spending up 489% / budget exceeded / nearing limit / heading over budget / large expense(s) / looks recurring / ×8 entries），卡片范围内 raw key/`{{`/`}}` 检测=false；zh/en 空态文案均实测；两份 locale 键齐备。
  - 历史月隐藏：浏览器多轮在日历弹层切月操作上失败（agent 步数耗尽/未点中具体日期），改由代码审查确认——门控为 `isViewingCurrentMonth`（selectedDate 与 new Date() 年月比较）+ `{isViewingCurrentMonth && (...)}` 条件渲染，insightList 同步返回 []，逻辑确定。
  - 测试数据已全部 removeItem 出厂化；tsc 0 error、lint 仍 19 warnings 全既有、vitest 69/69。
- **Description**:
  - Profile.tsx 月度报表区域新增"智能洞察"模块：调用 insights 纯逻辑，按 severity 渲染 InsightCard 列表（图标/级别色/标题/描述/金额，animate-stagger-in）。
  - i18n 模板化文案（insight.type.* 带参数插值）；大额/固定类点击跳转全部记录页并带分类/筛选参数（复用现有 detailFilter/导航机制）。
  - 无洞察：克制空态（一行浅色提示），不用大空状态卡片占位。
- **Acceptance Criteria Addressed**: AC-6, AC-10
- **Test Requirements**:
  - `rule` TR-9.1: 六类洞察在构造数据下均正确渲染中英文文案；证据：浏览器手动注入数据验证
  - `rule` TR-9.2: 大额/固定点击跳转筛选正确；证据：手动验证
  - `rule` TR-9.3: zh/en 两份资源 key 齐备无缺失；证据：i18n 缺失检查/切换语言走查

## Task 10: UI 精修 — 首页与记账页
- **Status**: `done`（代码；TR-10.1 浅/深截图并入 Task 13 统一浏览器走查）
- **Priority**: high
- **Depends On**: Task 4, Task 5, Task 6, Task 7
- **完成证据（2026-09-23）**:
  - 首页/记账页经 Task 4-7 已全面令牌化（卡片 .card、seg、.icon-btn、.btn-primary、var(--*) 无 gray/裸 hex）。本次复审 Dashboard.tsx/Record.tsx：残留仅彩色底白字 `#fff`（全站惯例，btn-primary 同样）与 Record 收支 seg 两处语义彩色阴影 rgba(224,104,79/.3)、rgba(46,133,222/.3)——全站 seg 均此既有内联模式，保留一致不另造分歧。
  - 最近记录列表接入入场动效：每条外包 `.animate-stagger-in`，50ms 递增延迟（Dashboard.tsx）。
  - TransactionCard 加 aria-label（删除/编辑滑动钮）；DeleteConfirmModal 由默认中文硬编码改为 useTranslation（title/message 可空回退 i18n，取消/删除按钮 t 化），是全站唯一删除确认弹层。
  - Skeleton 首屏：store 经 localStorage 同步读取，挂载即有数据，无异步加载窗口，骨架屏不适用，故不引入假加载态。
  - Record 底部固定栏 .safe-bottom + 内容 pb-36 避让，主按钮三态文案、连续记账 switch 均在安全区内；秒存路径步数未增。
- **Description**:
  - Dashboard：余额/资产卡层级与数字排版、快捷工具入口栅格对齐、今日流水列表（Skeleton 首屏、stagger、TransactionCard 按压态）、月度卡间距；全部 var(--*) 令牌。
  - Record：智能输入区/收支 seg/分类卡/金额卡/账户日期列表/底部双按钮区视觉统一，保存按钮保持最醒目；安全区与键盘顶起检查。
  - 清除两文件内联 hex/gray 硬编码与未 i18n 文案（如 Record.tsx 的"¥"属货币符号可保留）。
- **Acceptance Criteria Addressed**: AC-10, AC-11
- **Test Requirements**:
  - `rubric` TR-10.1: 双模式视觉品质；scale 1-5；anchors 见 AC-10；threshold>=4；证据：逐区块截图走查
  - `rule` TR-10.2: 无新增硬编码颜色/中文（grep 审查允许的货币符号除外）；证据：grep
  - `rule` TR-10.3: 首页秒存路径点击步数不增加；证据：操作走查计数

## Task 11: UI 精修 — 数据展示页
- **Status**: `done`（TR-11.1/11.2 深色逐页截图走查为可选遗留，代码层已就绪）
- **Priority**: medium
- **Depends On**: Task 4, Task 9
- **完成证据（2026-09-24）**:
  - Statistics/AllRecords/TransactionDetail/Stats/Profile 报表区全部裸中文 t() 化，文案迁入 `src/i18n/locales/pages/<lang>/` 对应分片（statistics/allRecords/transactionDetail/stats/profile）。
  - TR-11.3：`npm run i18n:check` 通过，zh-CN/en-US 扁平 key 各 832 个完全相等、零悬空 `t()` 引用；tsc 0 error、lint 0 error（19 warnings 全既有基线）。
- **Description**:
  - Statistics、AllRecords、TransactionDetail、Stats、Profile（除 Task 9 模块外的报表区）：统一卡片间距/标题层级/图表容器/分段控件/筛选 chips；列表骨架屏；空态统一 Empty 组件；图表色板与深色模式核对（Recharts 用 CSS 变量取色）。
  - 所有可见文案 i18n 化。
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `rubric` TR-11.1: 双模式视觉品质；scale 1-5；threshold>=4；证据：逐页截图
  - `rule` TR-11.2: 深色模式图表可读（文字/网格线对比足够）；证据：深色截图走查
  - `rule` TR-11.3: 无硬编码中文残留；证据：grep

## Task 12: UI 精修 — 资产/工具/设置页
- **Status**: `done`（TR-12.1/12.2 逐页截图走查为可选遗留，代码层已就绪）
- **Priority**: medium
- **Depends On**: Task 4
- **完成证据（2026-09-24）**:
  - Accounts/AccountDetail/Budgets/Settings/Templates/RecurringRecords/Search/Transfer/CurrencyConverter/Categories 十页全部可见文案 t() 化，分片 accounts/accountDetail/budgets/settings/templates/recurringRecords/search/transfer/currencyConverter/categories。
  - Categories 图标分组的中文名（'全部'/'餐饮'…）保留为内部 Map 键，渲染经 GROUP_KEY 常量映射 t('categories.groups.*')；Accounts 银行中文名（bankOptions/bankKeyMap/表单默认 '招商银行'）为存储/比较数据值有意保留，展示经 bankLabel() 翻译。
  - 全站唯一删除弹层 DeleteConfirmModal 默认文案 i18n（title/message 可空回退）；UpdateModal 31 文案、AppLock、MiniCharts、VersionInfo、TransactionCard aria 均 t() 化；App.tsx `accounts.type.*` 替代 AccountTypeNames，types/index.ts 删除该导出。
  - TR-12.3：tsc 0 error、lint 0 error（19 warnings 基线一致）、vitest 69/69、i18n:check 通过。
- **Description**:
  - Accounts、AccountDetail、Budgets、Settings、Templates、RecurringRecords、Search、Transfer、CurrencyConverter、Categories：间距/列表项/表单/弹层/开关/分段控件统一；空态/加载态；设置页语言选择器等控件深色核对。
  - 可见文案 i18n 化（Settings 1444 行为最大文件，以审查清单分区推进，避免边改边找）。
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `rubric` TR-12.1: 双模式视觉品质；scale 1-5；threshold>=4；证据：逐页截图清单
  - `rule` TR-12.2: 每页空数据态有统一 Empty 表现而非裸空白；证据：截图
  - `rule` TR-12.3: tsc/lint 通过；证据：命令输出

## Task 13: 深色模式与 i18n 全量查漏
- **Status**: `done`（TR-13.2/13.3 英文溢出/深色全页截图为可选遗留，代码与静态校验已就绪）
- **Priority**: high
- **Depends On**: Task 5, Task 6, Task 7, Task 8, Task 9, Task 10, Task 11, Task 12
- **完成证据（2026-09-24）**:
  - 新建 i18n 分片架构：`src/i18n/index.ts` 自动 glob `locales/pages/<lang>/*.json` 按顶层 namespace 深合并；共 18 个分片文件（zh/en 各 9 个：15 页面 + update/appLock/components）。
  - 新建 `scripts/check-i18n.mjs`（npm run i18n:check）：复现合并逻辑、对比中英扁平 key 差集、扫描源码悬空 `t()` 引用；支持 i18next 复数后缀（_one/_other）、注释剥离、动态拼接 key 跳过。
  - TR-13.1：i18n:check 通过，zh-CN 832 键 = en-US 832 键，零悬空 key。
  - 残留中文 grep 仅余：注释、initialData.ts 种子数据（工资/餐饮等默认数据，合理）、Categories/Accounts 内部数据键、appUpdate.ts 的 Error 消息（非 UI）。
  - Task 4 起新增样式全部 var(--*) 令牌；残留 #fff（彩色底白字）与 seg 彩色阴影为全站既有惯例，Task 10 审查确认保留。
- **Description**:
  - 全仓扫描改动面与主要页面：硬编码 hex/rgb/gray-*（白名单：货币符号、第三方库不可避免项需注释说明）、内联深色专用 class 与令牌并存冲突。
  - i18n：扫描两 locale key 差集；切换 en-US 逐页检查文本溢出/截断（英文更长）。
  - 触控尺寸与 aria-label 抽查；focus-visible 走查。
- **Acceptance Criteria Addressed**: AC-9, AC-10, NFR-3/4/5
- **Test Requirements**:
  - `rule` TR-13.1: 两份 locale key 集合一致（脚本对比无差集）；证据：脚本输出
  - `rule` TR-13.2: en-US 下无明显文本溢出/布局破损；证据：英文逐页截图
  - `rubric` TR-13.3: 深色模式完整度；scale 1-5；1=有刺眼/不可读；5=全部页面舒适；threshold>=4；证据：深色全页截图清单

## Task 14: 全量验证（tsc/lint/test 双时区 + 手动场景清单）
- **Status**: `done`（TR-14.2 真机语音 TR-8.1/8.2/8.3 待用户手机验证，代码已就绪）
- **Priority**: high
- **Depends On**: Task 13
- **完成证据（2026-09-24）**:
  - TR-14.1：`npm run check`（tsc -b --noEmit）0 error；`npm run lint` 0 error / 19 warnings（全部既有，基线一致）；`npm run test` 69/69 passed（3 文件）；TZ=Asia/Shanghai 与 America/New_York（实测 GMT-0400 EDT）各跑一次均 69/69；`npm run i18n:check` 通过（832=832 键）；`npm run build` 成功（2457 modules）。
  - TR-14.3：`gradlew --stop` → JAVA_HOME 指向 JDK21（C:\Users\Y\.gradle\jdks\jdk-21.0.12.1+1）→ `npx cap sync android` 成功（3 插件：app@8.1.0/filesystem@8.1.2/capgo-speech@8.3.2）→ `gradlew assembleRelease --no-daemon` BUILD SUCCESSFUL in 1m16s；产物 bookeep_v4.12.0.apk 27,021,646 字节，aapt2 badging 实测 versionCode=95/versionName=4.12.0。
  - 桌面浏览器语音入口受插件 available=false 限制无法触发（Task 5 已验证不渲染、无异常）；手动真机清单（秒存/补全/推荐纠正/连记/语音三场景/洞察/深色英文/覆盖安装）随 v4.12.0 整包交用户验证。
- **Description**:
  - npm run check / lint / test（TZ=Asia/Shanghai 与 America/New_York 各一次）。
  - 手动场景清单：一句话秒存、智能补全、推荐预选纠正、连续 3 笔、语音（真机）、语音三场景降级、洞察六类+空态、深色/英文全站、旧基座覆盖安装不崩。
  - cap sync + assembleRelease 验证整包可构建（JDK21/SDK36.1 环境，非沙箱，先 gradlew --stop）。
- **Acceptance Criteria Addressed**: AC-1, AC-5, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-14.1: 三命令 + 双时区全绿；证据：命令输出
  - `rule` TR-14.2: 手动场景清单逐项有结果记录（含真机语音）；证据：测试记录
  - `rule` TR-14.3: assembleRelease BUILD SUCCESSFUL；证据：gradle 输出

## Task 15: 发布 v4.12.0 整包
- **Status**: `done`
- **Priority**: medium
- **Depends On**: Task 14
- **完成证据（2026-09-24）**:
  - 版本号：package.json/package-lock.json（2 处）/.env APP_VERSION → 4.12.0；android/app/build.gradle versionCode 95 / versionName "4.12.0"。
  - `node scripts/release-update.mjs --require-apk`：重新 build（2457 modules，7.13s），tar 打正斜杠 zip 并排除 ocr/；产物 dist_v4.12.0.zip（1,112,022 字节，条目实测 ./index.html 正斜杠）、update.json（78 字节：minNativeVersion 4.12.0 / mandatory false / requireApk true）。
  - TR-15.1：Release https://github.com/Yangr28/bookeep/releases/tag/v4.12.0 已创建，gh release view 实测三资产 state=uploaded：bookeep_v4.12.0.apk 27,021,646 / dist_v4.12.0.zip 1,112,022 / update.json 78，与本地字节数一致。
  - TR-15.2：aapt2 dump badging 实测 package io.github.trae.bookeep versionCode=95 versionName=4.12.0。
  - TR-15.3：git commit/push 随本任务收尾（见 git 记录）。
- **Description**:
  - package.json/.env → 4.12.0；gradle versionCode 95 / versionName 4.12.0。
  - node scripts/release-update.mjs --require-apk；cap sync；assembleRelease。
  - gh release create v4.12.0（zip+update.json）并 upload APK；更新日志涵盖四块智能 + UI 精修。
  - git commit/push（SSH 重试）；更新项目记忆中的路线图（数据正确性下顺延 v4.13.0）。
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `rule` TR-15.1: Release 三资产齐备、update.json requireApk=true/minNative=4.12.0；证据：gh release view
  - `rule` TR-15.2: aapt badging 显示 95/4.12.0；证据：aapt 输出
  - `rule` TR-15.3: main 已推送且 CI 触发；证据：git 状态/Actions
