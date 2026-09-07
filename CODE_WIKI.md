# Bookeep Code Wiki

> 版本: 4.0.0 | 最后更新: 2026-07-17

---

## 目录

1. [项目概述](#1-项目概述)
2. [项目架构](#2-项目架构)
3. [目录结构](#3-目录结构)
4. [技术栈与依赖](#4-技术栈与依赖)
5. [核心类型定义](#5-核心类型定义)
6. [状态管理 (Store)](#6-状态管理-store)
7. [页面模块 (Pages)](#7-页面模块-pages)
8. [组件模块 (Components)](#8-组件模块-components)
9. [自定义 Hooks](#9-自定义-hooks)
10. [工具函数 (Utils)](#10-工具函数-utils)
11. [路由与导航](#11-路由与导航)
12. [模态框管理](#12-模态框管理)
13. [数据持久化](#13-数据持久化)
14. [构建与部署](#14-构建与部署)
15. [模块依赖关系图](#15-模块依赖关系图)
16. [项目运行方式](#16-项目运行方式)

---

## 1. 项目概述

**Bookeep** 是一款基于 React + TypeScript + Capacitor 构建的跨平台个人记账应用，主要面向 Android 平台。应用提供收支记录、分类管理、账户管理、预算管理、统计分析、OCR 识别记账、智能解析记账等核心功能。

- **应用名称**: Bookeep 记账
- **App ID**: `io.github.trae.bookeep`
- **当前版本**: 4.0.0
- **运行平台**: Android (Capacitor WebView)
- **语言**: 中文

---

## 2. 项目架构

```
┌─────────────────────────────────────────────────────┐
│                    Android Shell                     │
│              (Capacitor Native Bridge)               │
├─────────────────────────────────────────────────────┤
│                     WebView                         │
│  ┌───────────────────────────────────────────────┐  │
│  │              App.tsx (根组件)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  Pages   │ │Components│ │   Modals     │  │  │
│  │  │ (13个)   │ │ (12个)   │ │ (顶层渲染)   │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  Hooks   │ │  Store   │ │    Utils     │  │  │
│  │  │  (4个)   │ │ Zustand  │ │   (5个)      │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│              localStorage (持久化)                   │
│         @capacitor/filesystem (文件导出)             │
└─────────────────────────────────────────────────────┘
```

### 架构特点

- **单页应用**: 不使用 react-router，通过自定义 `useHistory` Hook 实现页面路由栈
- **Slice 模式状态管理**: Zustand Store 拆分为 9 个领域 Slice，组合为单一 Store
- **顶层模态框**: 所有模态框（日历、时间选择器、键盘、账户选择器等）在 App.tsx 顶层渲染，避免 transform 定位问题
- **深色模式**: 通过 Tailwind `dark:` 前缀类实现，由 `useTheme` Hook 控制
- **侧滑返回**: 自定义 `useSwipeBack` Hook 实现原生风格侧滑返回手势

---

## 3. 目录结构

```
bookeep/
├── src/                          # 前端源码
│   ├── App.tsx                   # 根组件（路由+模态框调度）
│   ├── main.tsx                  # 入口文件
│   ├── index.css                 # 全局样式
│   ├── vite-env.d.ts            # Vite 类型声明
│   ├── types/
│   │   └── index.ts             # 全局类型定义
│   ├── store/                    # Zustand 状态管理
│   │   ├── useStore.ts          # Store 组合入口
│   │   ├── transactionsSlice.ts # 交易 Slice
│   │   ├── categoriesSlice.ts   # 分类 Slice
│   │   ├── accountsSlice.ts     # 账户 Slice
│   │   ├── budgetsSlice.ts      # 预算 Slice
│   │   ├── calculationsSlice.ts # 计算聚合 Slice
│   │   ├── fixedDepositsSlice.ts# 定期存款 Slice
│   │   ├── loansSlice.ts        # 贷款 Slice
│   │   ├── transfersSlice.ts    # 转账 Slice
│   │   └── preferencesSlice.ts  # 偏好设置 Slice
│   ├── pages/                    # 页面组件 (13个)
│   │   ├── Dashboard.tsx        # 首页仪表盘
│   │   ├── Record.tsx           # 记账/编辑页面
│   │   ├── TransactionDetail.tsx# 交易明细页面
│   │   ├── AllRecords.tsx       # 全部记录页面
│   │   ├── Accounts.tsx         # 账户管理页面
│   │   ├── AccountDetail.tsx    # 账户详情页面
│   │   ├── Categories.tsx       # 分类管理页面
│   │   ├── Statistics.tsx       # 统计报表页面
│   │   ├── Stats.tsx            # 记账统计/成就页面
│   │   ├── Search.tsx           # 搜索页面
│   │   ├── Budgets.tsx          # 预算管理页面
│   │   ├── Transfer.tsx         # 转账页面
│   │   └── Settings.tsx         # 设置页面
│   ├── components/               # 通用组件 (12个)
│   │   ├── BottomNav.tsx        # 底部导航栏
│   │   ├── NumericKeypad.tsx    # 数字键盘
│   │   ├── CalendarPicker.tsx   # 日历选择器
│   │   ├── TimePicker.tsx       # 时间选择器
│   │   ├── CategoryCard.tsx     # 分类卡片
│   │   ├── TransactionCard.tsx  # 交易卡片
│   │   ├── StatCard.tsx         # 统计卡片
│   │   ├── Empty.tsx            # 空状态提示
│   │   ├── DeleteConfirmModal.tsx# 删除确认弹窗
│   │   ├── OCRRecordModal.tsx   # OCR 识别弹窗
│   │   ├── AppLock.tsx          # 应用锁
│   │   ├── SwipeBackIndicator.tsx# 侧滑指示器
│   │   └── VersionInfo.tsx      # 版本信息
│   ├── hooks/                    # 自定义 Hooks (4个)
│   │   ├── useHistory.ts        # 页面历史/路由
│   │   ├── useModal.ts          # 模态框状态管理
│   │   ├── useSwipeBack.ts      # 侧滑返回手势
│   │   └── useTheme.ts          # 主题切换
│   ├── utils/                    # 工具函数 (5个)
│   │   ├── format.ts            # 格式化工具
│   │   ├── export.ts            # 数据导入导出
│   │   ├── storage.ts           # 本地存储
│   │   ├── ocrParser.ts         # OCR 解析器
│   │   └── smartParser.ts       # 智能输入解析
│   ├── data/
│   │   └── initialData.ts       # 初始默认数据
│   ├── lib/
│   │   └── utils.ts             # cn() 样式合并工具
│   └── assets/
│       └── react.svg
├── android/                      # Capacitor Android 原生工程
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml
│       │   ├── assets/public/   # WebView 加载的 Web 产物
│       │   └── res/             # Android 资源
│       └── build.gradle         # Android 构建配置
├── public/                       # Web 静态资源
├── dist/                         # Vite 构建输出
├── build-outputs/                # 历史版本 APK 归档
├── scripts/                      # 图标生成脚本
├── .env                          # 环境变量 (APP_VERSION)
├── capacitor.config.json         # Capacitor 配置
├── package.json                  # 项目依赖
├── vite.config.ts                # Vite 构建配置
├── tailwind.config.js            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
├── postcss.config.js             # PostCSS 配置
├── eslint.config.js              # ESLint 配置
└── index.html                   # HTML 入口
```

---

## 4. 技术栈与依赖

### 核心框架

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | ^18.3.1 | UI 框架 |
| React DOM | ^18.3.1 | DOM 渲染 |
| TypeScript | ~5.8.3 | 类型安全 |
| Vite | ^6.3.5 | 构建工具 |

### 状态管理与路由

| 依赖 | 版本 | 用途 |
|------|------|------|
| Zustand | ^5.0.3 | 状态管理 (Slice 模式) |
| react-router-dom | ^7.3.0 | 依赖安装但未使用，路由由自定义 useHistory 实现 |

### UI 与样式

| 依赖 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | ^3.4.17 | 原子化 CSS 框架 |
| lucide-react | ^0.511.0 | 图标库 (200+ 图标) |
| clsx | ^2.1.1 | 条件类名拼接 |
| tailwind-merge | ^3.0.2 | Tailwind 类名去重合并 |
| recharts | ^3.8.1 | 图表库 (统计报表) |

### 原生与文件

| 依赖 | 版本 | 用途 |
|------|------|------|
| @capacitor/core | ^8.3.4 | Capacitor 核心 |
| @capacitor/android | ^8.3.4 | Android 平台 |
| @capacitor/app | ^8.1.0 | 返回按钮/退出控制 |
| @capacitor/filesystem | ^8.1.2 | 文件系统 (数据导出) |
| tesseract.js | ^7.0.0 | OCR 文字识别 |

### 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| @vitejs/plugin-react | ^4.4.1 | Vite React 插件 |
| vite-tsconfig-paths | ^5.1.4 | 路径别名支持 |
| autoprefixer | ^10.4.21 | CSS 前缀 |
| postcss | ^8.5.3 | CSS 处理 |
| eslint | ^9.25.0 | 代码检查 |

---

## 5. 核心类型定义

> 文件: `src/types/index.ts`

### TransactionType

```typescript
type TransactionType = 'income' | 'expense';
```
交易类型枚举：收入 / 支出。

### Category

```typescript
interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;     // lucide-react 图标名
  color: string;    // 十六进制颜色
}
```
收支分类。

### Transaction

```typescript
interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  createdAt: string;   // ISO 8601
  accountId: string;
}
```
交易记录核心模型。

### Account

```typescript
interface Account {
  id: string;
  name: string;
  type: 'bank' | 'alipay' | 'wechat' | 'cash' | 'other';
  balance: number;
  color: string;
  icon: string;
}
```
账户模型，`type` 区分银行/支付宝/微信/现金/其他。

### Transfer

```typescript
interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note: string;
  createdAt: string;
}
```
账户间转账记录。

### FixedDeposit

```typescript
interface FixedDeposit {
  id: string;
  name: string;
  bank: string;
  principal: number;
  rate: number;
  term: number;
  startDate: string;
  endDate: string;
  maturityAmount: number;
  status: 'active' | 'mature';
}
```
定期存款。

### Loan

```typescript
interface Loan {
  id: string;
  name: string;
  bank: string;
  principal: number;
  rate: number;
  term: number;
  startDate: string;
  monthlyPayment: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'active' | 'paid';
}
```
贷款。

### 常量映射

- `AccountTypeNames`: 账户类型中文名映射 (`bank→银行`, `alipay→支付宝` 等)
- `AccountIcons`: 账户类型默认图标映射 (`bank→Building2`, `wechat→MessageCircle` 等)

---

## 6. 状态管理 (Store)

### 架构

使用 Zustand v5 的 **Slice 模式**，将全局状态拆分为 9 个领域 Slice，在 `useStore.ts` 中组合为单一 Store。

```typescript
// useStore.ts
type Store = TransactionsSlice & CategoriesSlice & AccountsSlice 
           & FixedDepositsSlice & LoansSlice & TransfersSlice 
           & CalculationsSlice & PreferencesSlice & BudgetsSlice;

export const useStore = create<Store>()(
  (...args) => ({
    ...createTransactionsSlice(...args),
    ...createCategoriesSlice(...args),
    ...createAccountsSlice(...args),
    // ... 其余 Slice
  })
);
```

### Slice 详情

#### 6.1 TransactionsSlice

> 文件: `src/store/transactionsSlice.ts`

| 字段/方法 | 类型 | 说明 |
|-----------|------|------|
| `transactions` | `Transaction[]` | 交易列表 |
| `addTransaction(txn)` | function | 新增交易，**自动更新关联账户余额** |
| `updateTransaction(id, txn)` | function | 更新交易，**先回滚旧余额再应用新余额** |
| `deleteTransaction(id)` | function | 删除交易，**回滚账户余额** |
| `reorderTransactions(from, to)` | function | 交易排序 |
| `setTransactions(txns)` | function | 批量设置（数据导入） |

**关键逻辑**: 每次增删改交易时，同步更新对应 Account 的 balance，并调用 `saveAccounts()` 持久化。

#### 6.2 CategoriesSlice

> 文件: `src/store/categoriesSlice.ts`

| 字段/方法 | 类型 | 说明 |
|-----------|------|------|
| `categories` | `Category[]` | 分类列表 |
| `addCategory(cat)` | function | 新增分类 |
| `deleteCategory(id)` | function | 删除分类 |
| `getCategoryById(id)` | function | 按 ID 查找分类 |
| `setCategories(cats)` | function | 批量设置 |

#### 6.3 AccountsSlice

> 文件: `src/store/accountsSlice.ts`

| 字段/方法 | 类型 | 说明 |
|-----------|------|------|
| `accounts` | `Account[]` | 账户列表 |
| `addAccount(acc)` | function | 新增账户 |
| `deleteAccount(id)` | function | 删除账户 |
| `updateAccount(id, updates)` | function | 部分更新账户 |
| `reorderAccounts(from, to)` | function | 账户排序 |
| `getAccountById(id)` | function | 按 ID 查找 |
| `setAccounts(accs)` | function | 批量设置 |

#### 6.4 BudgetsSlice

> 文件: `src/store/budgetsSlice.ts`

| 字段/方法 | 类型 | 说明 |
|-----------|------|------|
| `budgets` | `Budget[]` | 预算列表 |
| `addBudget(categoryId, amount, month)` | function | 设置分类月度预算（已有则更新） |
| `updateBudget(id, updates)` | function | 更新预算 |
| `deleteBudget(id)` | function | 删除预算 |
| `getBudgetByCategory(catId, month)` | function | 查找分类月度预算 |
| `calculateBudgetUsage(catId, month, txns)` | function | 计算预算使用率（返回 budget/spent/percentage） |

**Budget 类型**:
```typescript
interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month: string;  // "YYYY-MM" 格式
}
```

#### 6.5 CalculationsSlice

> 文件: `src/store/calculationsSlice.ts`

纯计算 Slice，依赖其他 Slice 的数据，提供聚合查询方法：

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| `getTotalAssets()` | number | 总资产 = 账户余额之和 + 定期存款之和 |
| `getTotalFixedDeposits()` | number | 定期存款总额 |
| `getTotalLoans()` | number | 贷款余额总额 |
| `getTodayIncome()` | number | 今日收入 |
| `getTodayExpense()` | number | 今日支出 |
| `getMonthIncome(month?, year?)` | number | 月度收入 |
| `getMonthExpense(month?, year?)` | number | 月度支出 |
| `getTotalIncome()` | number | 总收入 |
| `getTotalExpense()` | number | 总支出 |
| `getTotalBalance()` | number | 总结余 = 总收入 - 总支出 |
| `getTransactionsByMonth(month, year)` | Transaction[] | 按月筛选交易 |
| `getTransactionsByAccount(accountId)` | Transaction[] | 按账户筛选交易 |
| `getAccountIncome(accountId)` | number | 账户收入总额 |
| `getAccountExpense(accountId)` | number | 账户支出总额 |
| `getTransactionsGroupedByCategory(type, month?, year?)` | {category, total}[] | 按分类分组汇总（降序） |

#### 6.6 FixedDepositsSlice

> 文件: `src/store/fixedDepositsSlice.ts`

| 字段/方法 | 说明 |
|-----------|------|
| `fixedDeposits` | 定期存款列表 |
| `addFixedDeposit(deposit)` | 新增 |
| `deleteFixedDeposit(id)` | 删除 |
| `updateFixedDeposit(id, updates)` | 更新 |

#### 6.7 LoansSlice

> 文件: `src/store/loansSlice.ts`

| 字段/方法 | 说明 |
|-----------|------|
| `loans` | 贷款列表 |
| `addLoan(loan)` | 新增 |
| `deleteLoan(id)` | 删除 |
| `updateLoan(id, updates)` | 更新 |

#### 6.8 TransfersSlice

> 文件: `src/store/transfersSlice.ts`

| 字段/方法 | 说明 |
|-----------|------|
| `transfers` | 转账记录列表 |
| `addTransfer(transfer)` | 新增转账，**自动扣减源账户余额、增加目标账户余额** |
| `deleteTransfer(id)` | 删除转账，**回滚两个账户余额** |
| `getTransfersByAccount(accountId)` | 查询账户相关转账 |

#### 6.9 PreferencesSlice

> 文件: `src/store/preferencesSlice.ts`

| 字段/方法 | 说明 |
|-----------|------|
| `lastUsedAccountId` | 上次使用的账户 ID |
| `lastUsedCategoryId` | 上次使用的分类 ID |
| `lastUsedType` | 上次使用的交易类型 |
| `quickAmounts` | 快捷金额列表 (默认: 5/10/20/50/100/500) |
| `setLastUsedAccountId/setLastUsedCategoryId/setLastUsedType` | 设置偏好 |
| `addQuickAmount/removeQuickAmount` | 管理快捷金额 |

---

## 7. 页面模块 (Pages)

### 7.1 Dashboard (首页仪表盘)

> 文件: `src/pages/Dashboard.tsx` (~288 行)

**功能**:
- 资产概览：总资产、本月结余、今日收支
- 快速记账区：支持金额输入、分类选择、类型切换、备注、日期时间设置
- 近期交易列表
- 账户余额一览
- 快捷入口：全部记录、账户管理、预算、统计、搜索、设置、OCR 识别

**关键 Props**: `quickRecordAmount/Type/CategoryId/Note/AccountId/DateTime` 及对应 onChange 回调、`onQuickRecordSubmit`、`onViewDetail`、`onEditTransaction` 等

### 7.2 Record (记账页面)

> 文件: `src/pages/Record.tsx` (~213 行)

**功能**:
- 金额输入（显示/键盘输入）
- 收入/支出类型切换
- 分类网格选择
- 日期时间选择
- 账户选择
- 备注输入
- 支持编辑模式（传入 `editTransaction`）
- 底部固定保存按钮

### 7.3 TransactionDetail (交易明细)

> 文件: `src/pages/TransactionDetail.tsx` (~133 行)

**功能**:
- 根据 `filterType` 筛选展示交易列表
- 支持日期快速预设（本月/上月/近三月/自定义）
- 分类维度查看
- 交易卡片点击可编辑

### 7.4 AllRecords (全部记录)

> 文件: `src/pages/AllRecords.tsx` (~156 行)

**功能**:
- 按日期分组展示所有交易
- 支持日期筛选
- 交易卡片可编辑

### 7.5 Accounts (账户管理)

> 文件: `src/pages/Accounts.tsx` (~259 行)

**功能**:
- 账户列表展示（图标、名称、余额）
- 新增账户（名称、类型、初始余额、图标、颜色）
- 编辑/删除账户
- 账户余额统计
- 定期存款管理
- 贷款管理

### 7.6 AccountDetail (账户详情)

> 文件: `src/pages/AccountDetail.tsx` (~288 行)

**功能**:
- 指定账户的收支明细
- 账户收入/支出汇总
- 交易列表

### 7.7 Categories (分类管理)

> 文件: `src/pages/Categories.tsx` (~307 行)

**功能**:
- 收入/支出分类列表
- 新增分类（名称、图标、颜色）
- 编辑/删除分类
- 分类使用统计

### 7.8 Statistics (统计报表)

> 文件: `src/pages/Statistics.tsx` (~270 行)

**功能**:
- 月度收支统计
- 分类占比饼图/环形图 (recharts)
- 月度趋势图
- 日历选择月份

### 7.9 Stats (记账统计/成就)

> 文件: `src/pages/Stats.tsx` (~357 行)

**功能**:
- 连续记账天数
- 总记账笔数
- 8 个成就徽章系统
- 本月/本周统计
- 记账频率分析

### 7.10 Search (搜索)

> 文件: `src/pages/Search.tsx` (~143 行)

**功能**:
- 关键词搜索交易
- 按备注、金额、分类名过滤
- 搜索结果高亮匹配

### 7.11 Budgets (预算管理)

> 文件: `src/pages/Budgets.tsx` (~258 行)

**功能**:
- 按支出分类设定月度预算
- 预算使用进度条
- 超支预警

### 7.12 Transfer (转账)

> 文件: `src/pages/Transfer.tsx` (~190 行)

**功能**:
- 选择源账户和目标账户
- 输入转账金额和备注
- 执行转账

### 7.13 Settings (设置)

> 文件: `src/pages/Settings.tsx` (~340 行)

**功能**:
- 深色模式切换
- 数据导出 (JSON)
- 数据导入
- 版本更新日志
- 关于信息

---

## 8. 组件模块 (Components)

### 8.1 BottomNav (底部导航)

> 文件: `src/components/BottomNav.tsx` (~45 行)

- 4 个主要 Tab: 首页 `/`、分类 `/categories`、统计 `/statistics`、账户 `/accounts`
- 高亮当前页，点击触发 `onPageChange`

### 8.2 NumericKeypad (数字键盘)

> 文件: `src/components/NumericKeypad.tsx` (~134 行)

- 0-9 数字键 + 小数点 + 删除 + 清空
- 支持金额输入限制（12位、单小数点）
- 完整深色模式适配

### 8.3 CalendarPicker (日历选择器)

> 文件: `src/components/CalendarPicker.tsx` (~120 行)

- 月视图日历
- 年月切换
- 日期选中高亮
- 固定定位全屏覆盖

### 8.4 TimePicker (时间选择器)

> 文件: `src/components/TimePicker.tsx` (~64 行)

- 小时/分钟滚轮选择
- 当前时间高亮
- 固定定位全屏覆盖

### 8.5 CategoryCard (分类卡片)

> 文件: `src/components/CategoryCard.tsx` (~123 行)

- 分类图标 + 名称 + 颜色展示
- 选中态高亮
- 支持点击选择

### 8.6 TransactionCard (交易卡片)

> 文件: `src/components/TransactionCard.tsx` (~145 行)

- 交易摘要：分类图标、备注、金额、日期时间
- 收入绿色 / 支出红色
- 支持点击编辑

### 8.7 StatCard (统计卡片)

> 文件: `src/components/StatCard.tsx` (~80 行)

- 标题 + 数值 + 图标的统计展示卡片
- 支持颜色主题

### 8.8 Empty (空状态)

> 文件: `src/components/Empty.tsx` (~50 行)

- 图标 + 文字的空状态提示
- 可自定义消息

### 8.9 DeleteConfirmModal (删除确认)

> 文件: `src/components/DeleteConfirmModal.tsx` (~108 行)

- 确认删除弹窗
- 取消/确认按钮

### 8.10 OCRRecordModal (OCR 识别)

> 文件: `src/components/OCRRecordModal.tsx` (~282 行)

- 拍照/选择图片
- Tesseract.js OCR 识别
- 解析结果展示与编辑
- 一键保存为交易记录

### 8.11 AppLock (应用锁)

> 文件: `src/components/AppLock.tsx` (~156 行)

- 密码锁屏界面
- `isAppLocked()`: 检查是否启用应用锁
- `onUnlock`: 解锁回调

### 8.12 SwipeBackIndicator (侧滑指示器)

> 文件: `src/components/SwipeBackIndicator.tsx` (~42 行)

- 侧滑时的视觉提示条

### 8.13 VersionInfo (版本信息)

> 文件: `src/components/VersionInfo.tsx` (~56 行)

- 显示当前版本号（从 `import.meta.env.APP_VERSION` 读取）

---

## 9. 自定义 Hooks

### 9.1 useHistory (页面路由)

> 文件: `src/hooks/useHistory.ts`

**核心**: 自定义路由栈，不依赖 react-router。

```typescript
const mainPages = ['/', '/record', '/categories', '/statistics', '/accounts'];
```

| 方法 | 说明 |
|------|------|
| `handlePageChange(page)` | 导航到指定页面。主页面会重用历史栈中的位置（避免重复堆叠）；详情页面正常压栈 |
| `goBack()` | 弹出栈顶，返回上一页 |
| `canGoBack()` | 判断是否可返回 |
| `resetHistory(page?)` | 重置历史栈（记账成功后调用） |

**路由策略**: 区分主页面（底部导航页）和详情页，主页面切换时智能裁剪历史栈。

### 9.2 useModal (模态框状态)

> 文件: `src/hooks/useModal.ts`

集中管理所有模态框和记录相关状态：

| 状态 | 类型 | 说明 |
|------|------|------|
| `showCalendar` | boolean | 统计日历 |
| `showRecordDatePicker` | boolean | 记录日期选择器 |
| `showRecordTimePicker` | boolean | 记录时间选择器 |
| `showAccountPicker` | boolean | 账户选择器 |
| `showKeypad` | boolean | 数字键盘 |
| `showExitConfirm` | boolean | 退出确认 |
| `recordDateTime` | Date | 记录日期时间 |
| `recordAccountId` | string\|null | 记录账户 |
| `recordAmount` | string | 记录金额 |
| `recordNote` | string | 记录备注 |
| `recordCategoryId` | string\|null | 记录分类 |
| `recordType` | 'expense'\|'income' | 记录类型 |
| `editTransaction` | Transaction\|null | 编辑中的交易 |
| `detailFilter` | FilterType | 明细筛选类型 |
| `selectedCategoryId` | string\|null | 选中的分类 |
| `selectedAccountId` | string\|null | 选中的账户 |

提供通用方法: `openModal()`, `closeModal()`, `closeAllModals()`, `setModal()`，以及每个状态的专用 setter。

### 9.3 useSwipeBack (侧滑返回)

> 文件: `src/hooks/useSwipeBack.ts`

| 参数 | 说明 |
|------|------|
| `onSwipeBack` | 触发返回的回调 |
| `enabled` | 是否启用（模态框打开时禁用） |
| `threshold` | 触发阈值（默认 30px） |

| 返回值 | 说明 |
|--------|------|
| `swipeProgress` | 滑动进度 (-1 ~ 1) |
| `isSwiping` | 是否正在滑动 |
| `showLeftIndicator` | 显示左侧指示器 |
| `showRightIndicator` | 显示右侧指示器 |

**实现**: 监听 `touchstart/touchmove/touchend` 事件，检测屏幕左右 20% 区域的水平滑动手势，超过阈值触发 `onSwipeBack`。

### 9.4 useTheme (主题)

> 文件: `src/hooks/useTheme.ts`

| 返回值 | 说明 |
|--------|------|
| `theme` | 'light' \| 'dark' |
| `isDark` | 是否深色模式 |
| `toggleTheme()` | 切换主题 |

- 首次加载读取 `localStorage('theme')`，无则跟随系统 `prefers-color-scheme`
- 切换时同步更新 `<html>` 的 class 和 localStorage

---

## 10. 工具函数 (Utils)

### 10.1 format.ts (格式化)

| 函数 | 签名 | 说明 |
|------|------|------|
| `formatCurrency` | `(amount: number) => string` | 中文本地化货币格式（2位小数） |
| `formatCurrencyShort` | `(amount: number) => string` | 带符号 ¥ 的货币格式 |
| `formatDate` | `(dateString: string) => string` | "2026年7月17日" |
| `formatDateTime` | `(dateString: string) => string` | "2026-07-17 14:30" |
| `formatDateShort` | `(dateString: string) => string` | "7月17日" |
| `formatTime` | `(dateString: string) => string` | "14:30" |
| `getTodayString` | `() => string` | 今日 ISO 日期 |
| `isToday` | `(dateString: string) => boolean` | 是否今天 |
| `isYesterday` | `(dateString: string) => boolean` | 是否昨天 |
| `getMonthStart` | `(date?) => Date` | 月初日期 |
| `getMonthEnd` | `(date?) => Date` | 月末日期 |

### 10.2 export.ts (数据导入导出)

| 函数 | 签名 | 说明 |
|------|------|------|
| `exportData` | `(txns, accs, cats) => ExportData` | 组装导出数据（含版本和时间戳） |
| `downloadExportFile` | `(data) => Promise<string>` | 下载导出文件。优先用 Capacitor Filesystem，失败回退浏览器 `<a>` 下载 |
| `importData` | `(jsonString) => ExportData` | 解析导入 JSON |

**ExportData 结构**:
```typescript
interface ExportData {
  version: string;
  exportTime: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}
```

### 10.3 storage.ts (本地存储)

| 函数 | 说明 |
|------|------|
| `loadFromStorage<T>(key, default)` | 从 localStorage 读取，异常返回默认值 |
| `saveToStorage<T>(key, value)` | 写入 localStorage |
| `loadTransactions/saveTransactions` | 交易数据存取 (`bookeep_transactions`) |
| `loadCategories/saveCategories` | 分类数据存取 (`bookeep_categories`) |
| `loadAccounts/saveAccounts` | 账户数据存取 (`bookeep_accounts`) |
| `loadFixedDeposits/saveFixedDeposits` | 定期存款存取 (`bookeep_fixed_deposits`) |
| `loadLoans/saveLoans` | 贷款存取 (`bookeep_loans`) |
| `loadTransfers/saveTransfers` | 转账存取 (`bookeep_transfers`) |

### 10.4 ocrParser.ts (OCR 解析)

| 函数 | 签名 | 说明 |
|------|------|------|
| `parseOCRText` | `(text: string) => OCRParseResult` | 从 OCR 识别文本提取金额/备注/类型/日期/时间 |
| `findCategoryByIdentifierOCR` | `(categories, type, note) => string\|null` | 根据关键词匹配分类 |
| `processOCRResult` | `(result, categories) => ParsedTransaction` | 将 OCR 结果转为交易数据 |
| `extractTransactionsFromText` | `(text, categories) => ParsedTransaction[]` | 批量提取多行文本中的交易 |
| `recognizeImage` | `(imageDataUrl) => Promise<string>` | Tesseract.js 图片识别（中文简体） |

**解析策略**:
- 金额: 优先匹配 `数字+货币单位(元/块/¥)`，回退匹配 `支付/消费+数字`
- 类型: 通过收入/支出关键词判断
- 分类: 通过 `categoryKeywords` 映射匹配
- 日期/时间: 正则提取

### 10.5 smartParser.ts (智能解析)

| 函数 | 签名 | 说明 |
|------|------|------|
| `parseSmartInput` | `(input: string) => ParseResult` | 智能解析用户输入文本 |
| `findCategoryByIdentifier` | `(categories, type, keyword) => string\|null` | 多策略分类匹配 |

**解析策略（优先级从高到低）**:
1. **精确匹配**: 在 `expenseKeywordCategories` 中查找输入包含的关键词
2. **别名匹配**: 在 `categoryAliases` 中查找
3. **编辑距离相似度**: `calculateSimilarity()` > 0.6 时匹配
4. **拼音匹配**: 通过 `pinyinMap` 将中文转拼音再匹配
5. **通用映射**: `commonMappings` 常见品牌→分类

**关键数据**:
- `incomeKeywords`: 50+ 收入关键词
- `expenseKeywordCategories`: 10 个支出大类，每类 20-50 个关键词
- `categoryAliases`: 9 组分类别名
- `pinyinMap`: 60+ 拼音→中文映射

---

## 11. 路由与导航

### 页面路由映射

| 路径 | 页面组件 | 类型 | 底部导航 |
|------|----------|------|----------|
| `/` | Dashboard | 主页面 | 显示 |
| `/record` | Record | 主页面 | 隐藏 |
| `/categories` | Categories | 主页面 | 显示 |
| `/statistics` | Statistics | 主页面 | 显示 |
| `/accounts` | Accounts | 主页面 | 显示 |
| `/detail` | TransactionDetail | 详情页 | 隐藏 |
| `/account-detail` | AccountDetail | 详情页 | 隐藏 |
| `/all-records` | AllRecords | 详情页 | 隐藏 |
| `/settings` | Settings | 详情页 | 隐藏 |
| `/search` | Search | 详情页 | 隐藏 |
| `/budgets` | Budgets | 详情页 | 隐藏 |
| `/stats` | Stats | 详情页 | 隐藏 |
| `/transfer` | Transfer | 详情页 | 隐藏 |

### 导航逻辑

- **主页面切换**: 通过 `BottomNav` 组件或 Dashboard 中的入口
- **详情页进入**: 从主页面点击项目进入
- **返回**: Android 返回键 / 侧滑手势 / 页面内返回按钮
- **模态框优先**: 返回操作先关闭模态框，再执行页面返回
- **退出确认**: 主页面无历史时弹出退出确认框

---

## 12. 模态框管理

### 模态框层级（z-index 优先级从高到低）

| 模态框 | z-index | 触发方式 |
|--------|---------|----------|
| 退出确认 | z-50 | 返回键在主页 |
| 账户选择器 | z-100 | 记账时选账户 |
| 日历选择器 | 固定全屏 | 选日期 |
| 时间选择器 | 固定全屏 | 选时间 |
| 数字键盘 | 固定底部 | 输入金额 |
| OCR 识别 | 固定全屏 | 首页 OCR 入口 |
| Toast 提示 | z-100 | 记账成功/修改成功 |

### 模态框关闭优先级

退出确认 > 数字键盘 > 账户选择器 > 时间选择器 > 日期选择器 > 日历

### 关键约束

- 所有模态框在 App.tsx 顶层渲染，避免 CSS transform 导致 fixed 定位失效
- 模态框打开时禁用侧滑手势 (`hasModalOpen` 检测)
- 模态框打开时页面禁止滚动 (`overflow-hidden`)

---

## 13. 数据持久化

### 存储机制

- **引擎**: `localStorage`
- **键名前缀**: `bookeep_`
- **数据格式**: JSON 字符串
- **初始化**: 每个 Slice 启动时调用 `loadXxx(initialXxx)`，优先读取 localStorage，无数据时使用 `initialData.ts` 中的默认值

### 数据同步

- 每次状态变更（增删改）后立即调用 `saveXxx()` 持久化
- 交易变更同步更新账户余额并持久化
- 转账变更同步更新双方账户余额

### 数据导入导出

- **导出**: JSON 格式，包含 transactions + accounts + categories，带版本号和时间戳
- **导出路径**: Capacitor Filesystem `Documents` 目录，回退浏览器 `<a>` 标签下载
- **文件名**: `bookeep_backup_YYYY-MM-DD.json`
- **导入**: 解析 JSON，通过 `setTransactions/setAccounts/setCategories` 覆盖写入

---

## 14. 构建与部署

### Vite 构建配置

> 文件: `vite.config.ts`

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `define.APP_VERSION` | 从 `.env` 注入 | 版本号注入运行时 |
| `build.sourcemap` | 'hidden' | 隐藏 sourcemap |
| `server.host` | '0.0.0.0' | 开发服务器监听所有地址 |
| `server.port` | 5173 | 开发端口 |
| plugins | react + traeBadge + tsconfigPaths | React JSX / TRAE 标记 / 路径别名 |

### Tailwind 配置

| 配置项 | 值 |
|--------|-----|
| `darkMode` | 'class' |
| `content` | `./index.html`, `./src/**/*.{js,ts,jsx,tsx}` |

### TypeScript 配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `target` | ES2020 | 编译目标 |
| `jsx` | react-jsx | React 17+ JSX 转换 |
| `strict` | false | 未启用严格模式 |
| `baseUrl` | './' | 路径解析基准 |
| `paths.@/*` | './src/*' | @ 路径别名 |

### Android 构建配置

> 文件: `android/app/build.gradle`

| 配置项 | 值 |
|--------|-----|
| `namespace` | io.github.trae.bookeep |
| `compileSdkVersion` | 36 |
| `targetSdkVersion` | 36 |
| `versionCode` | 65 |
| `versionName` | 4.0.0 |
| `minSdkVersion` | 由 variables.gradle 定义 |
| `APK 输出格式` | `bookeep_v${versionName}.apk` |

### Capacitor 配置

> 文件: `capacitor.config.json`

| 配置项 | 值 |
|--------|-----|
| `appId` | io.github.trae.bookeep |
| `appName` | bookeep |
| `webDir` | dist |
| `androidScheme` | https |

---

## 15. 模块依赖关系图

```
App.tsx
├── pages/
│   ├── Dashboard ──→ store, components, hooks, utils/format, utils/smartParser
│   ├── Record ──→ store, components, utils/format
│   ├── TransactionDetail ──→ store, components, utils/format
│   ├── AllRecords ──→ store, components, utils/format
│   ├── Accounts ──→ store, components, utils/format
│   ├── AccountDetail ──→ store, components, utils/format
│   ├── Categories ──→ store, components
│   ├── Statistics ──→ store, components, utils/format, recharts
│   ├── Stats ──→ store, components, utils/format
│   ├── Search ──→ store, components, utils/format
│   ├── Budgets ──→ store, components, utils/format
│   ├── Transfer ──→ store, components
│   └── Settings ──→ store, utils/export, utils/storage
├── components/
│   ├── BottomNav
│   ├── NumericKeypad
│   ├── CalendarPicker ──→ utils/format
│   ├── TimePicker
│   ├── CategoryCard ──→ lucide-react
│   ├── TransactionCard ──→ store, utils/format, lucide-react
│   ├── StatCard
│   ├── Empty
│   ├── DeleteConfirmModal
│   ├── OCRRecordModal ──→ utils/ocrParser, tesseract.js, store
│   ├── AppLock ──→ localStorage
│   ├── SwipeBackIndicator
│   └── VersionInfo ──→ import.meta.env
├── hooks/
│   ├── useHistory ──→ (纯逻辑，无外部依赖)
│   ├── useModal ──→ types
│   ├── useSwipeBack ──→ (DOM 事件)
│   └── useTheme ──→ localStorage, DOM
├── store/
│   ├── useStore ──→ 所有 Slice
│   ├── transactionsSlice ──→ types, initialData, utils/storage
│   ├── categoriesSlice ──→ types, initialData, utils/storage
│   ├── accountsSlice ──→ types, initialData, utils/storage
│   ├── budgetsSlice ──→ (纯逻辑)
│   ├── calculationsSlice ──→ types (跨 Slice 依赖)
│   ├── fixedDepositsSlice ──→ types, initialData, utils/storage
│   ├── loansSlice ──→ types, initialData, utils/storage
│   ├── transfersSlice ──→ types, initialData, utils/storage
│   └── preferencesSlice ──→ (纯逻辑)
└── utils/
    ├── format ──→ (纯函数)
    ├── export ──→ types, @capacitor/filesystem
    ├── storage ──→ localStorage
    ├── ocrParser ──→ types, tesseract.js
    └── smartParser ──→ types
```

---

## 16. 项目运行方式

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 类型检查
npm run check

# 代码检查
npm run lint
```

### 构建与部署

```bash
# 构建 Web 产物 (输出到 dist/)
npm run build

# 预览构建结果
npm run preview

# 同步到 Android 项目
npx cap sync android

# 打开 Android Studio (可选)
npx cap open android

# 构建 APK (在 android 目录下)
cd android && ./gradlew assembleDebug
# APK 输出: android/app/build/outputs/apk/debug/bookeep_v4.0.0.apk
```

### 版本更新流程

1. 更新 `.env` 中的 `APP_VERSION`
2. 更新 `package.json` 中的 `version`
3. 更新 `android/app/build.gradle` 中的 `versionName` 和 `versionCode`
4. 执行构建: `npm run build`
5. 同步: `npx cap sync android`
6. 构建 APK: `cd android && ./gradlew assembleDebug`
7. 归档 APK 到 `build-outputs/` 目录

---

> 文档生成时间: 2026-07-17 | 基于 Bookeep v4.0.0 代码库
