# お直しシート MVP 詳細設計書

## 1. 概要

### 1.1 目標
Phase 1として、お直し管理の基本機能を持つWebアプリケーションを構築し、店舗スタッフが日常業務で使えるレベルにする。

### 1.2 スコープ
- ✅ お直し記録の登録・閲覧・編集
- ✅ 限界値チェック機能
- ✅ 料金・納期自動計算
- ✅ レスポンシブデザイン（PC・タブレット・スマホ）
- ✅ Google OAuth認証
- ✅ 既存データインポート機能

### 1.3 スコープ外（Phase 2以降）
- ❌ サイズ更新シート
- ❌ 高度な検索・フィルタリング
- ❌ ダッシュボード・統計分析
- ❌ 権限管理
- ❌ 通知機能

---

## 2. 画面設計

### 2.1 画面一覧

1. **ログイン画面** (`/login`)
   - Google OAuth認証ボタン

2. **お直し一覧画面** (`/repairs`) - **メイン画面**
   - お直し記録の一覧表示
   - 新規登録ボタン
   - 検索バー（顧客名、注文詳細ID）
   - シンプルなフィルター（店舗、日付範囲）

3. **お直し登録・編集画面** (`/repairs/new`, `/repairs/[id]/edit`)
   - ステップ形式の入力フォーム
   - リアルタイム料金・納期表示
   - 限界値チェック結果表示

4. **お直し詳細画面** (`/repairs/[id]`)
   - 登録内容の確認
   - 編集・削除ボタン
   - 印刷用レイアウト（預かり票）

### 2.2 画面フロー

```
[ログイン画面]
    ↓ Google認証
[お直し一覧画面] ← デフォルト画面
    ↓
    ├→ [新規登録] → [お直し登録画面]
    │                      ↓ 保存
    │                 [お直し詳細画面]
    │
    └→ [既存レコード選択] → [お直し詳細画面]
                                  ↓ 編集
                             [お直し編集画面]
```

---

## 3. お直し登録・編集画面の詳細設計

### 3.1 ステップ構成

#### ステップ1: 基本情報
- 店舗選択（ドロップダウン）
- 顧客名（テキスト入力）
- 注文詳細ID（テキスト入力）
- 来店日時（日付ピッカー）
- **サポート区分**（ラジオボタン）:
  - ○ サポート内（無料）
  - ○ サポート外（有料）

#### ステップ2: アイテム選択
- アイテムタイプ選択（ボタン選択）
  - ジャケット / ジャコット
  - スラックス / カジュアルパンツ
  - シャツ
  - ベスト
  - チノ

#### ステップ3: お直し箇所入力
- **アイテム別に動的に表示**
- 各部位ごとの入力フィールド：
  - チェックボックス（お直しするかどうか）
  - 修正数値（数値入力、+/- cm）
  - 仕上がり数値（数値入力、cm）

**例: ジャケットの場合**
```
☐ 肩幅       修正: [  ] cm  仕上がり: [  ] cm
☐ バスト     修正: [  ] cm  仕上がり: [  ] cm
☐ ウエスト   修正: [  ] cm  仕上がり: [  ] cm
☐ 袖丈       修正: [  ] cm  仕上がり: [  ] cm  ※左右1箇所換算
☐ 着丈       修正: [  ] cm  仕上がり: [  ] cm
...
```

- **リアルタイム限界値チェック**
  - 各入力に対して即座にチェック
  - ✅ お直し可能（緑）
  - ⚠️ 要確認（黄）
  - ❌ 再製作必要（赤）

- **料金・納期表示**
  - 箇所数自動カウント
  - 税込料金リアルタイム表示
  - 納期リアルタイム表示

#### ステップ4: 原因分析
- **お客様のご要望**（テキストエリア + テンプレート選択）
  - テンプレート選択ドロップダウン:
    - 「サイズが合わない」
    - 「シルエットを変更したい」
    - 「体型に合わせて調整したい」
    - 「その他」
  - 選択すると自動的にテキストエリアに挿入
  - 自由に編集可能

- **体型変動の有無**（ラジオボタン）:
  - ○ あり / ○ なし

- **お直しが起きた原因**（テキストエリア + テンプレート選択）
  - テンプレート選択ドロップダウン:
    - 「お客様のご要望による変更」
    - 「体型変化による調整」
    - 「ヒアリング不足」
    - 「要望のすり合わせ不足」
    - 「採寸ミス」
    - 「その他」
  - 選択すると自動的にテキストエリアに挿入
  - 自由に編集可能

#### ステップ5: 備考
- 備考・エピソード（テキストエリア）

#### ステップ6: 確認
- 入力内容のサマリー表示
- 保存ボタン

### 3.2 バリデーション

- **必須項目**:
  - 店舗
  - 顧客名
  - 来店日時
  - アイテム選択
  - 最低1箇所のお直し項目

- **数値チェック**:
  - 修正数値: -20cm ～ +20cm の範囲
  - 仕上がり数値: 正の数

- **限界値チェック**:
  - マスタデータと照合
  - 警告表示（ユーザーは保存可能）

---

## 4. データモデル（詳細版）

### 4.1 Prismaスキーマ

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ユーザー（スタッフ）
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  repairs   RepairRecord[]
}

// お直し記録
model RepairRecord {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // 基本情報
  store          String   // 店舗名
  customerName   String   // 顧客名
  orderDetailId  String?  // 注文詳細ID
  visitDate      DateTime // 来店日時
  supportType    String   @default("within") // サポート区分: "within" | "outside"
  status         String   @default("in_progress") // ステータス: "in_progress" | "completed"

  // お直し詳細（JSON）
  items          Json     // RepairItem[]

  // 原因分析
  customerRequest String? @db.Text // お客様のご要望
  bodyChange      Boolean @default(false) // 体型変動
  rootCause       String? @db.Text // 原因

  // 備考
  notes          String? @db.Text

  // 計算結果
  totalCost      Float    // 総額（税込）※サポート内の場合は0
  deliveryDate   DateTime // 納期

  // 作成者
  userId         String
  user           User     @relation(fields: [userId], references: [id])

  @@index([store])
  @@index([customerName])
  @@index([visitDate])
  @@index([status])
}

// お直し限界値マスタ
model RepairLimit {
  id            String   @id @default(cuid())
  itemType      String   // アイテムタイプ（jacket, pants, shirt, vest, chino）
  part          String   // 部位（shoulderWidth, bust, waist, etc.）
  minChange     Float    // 最小変更値（cm）
  maxChange     Float    // 最大変更値（cm）
  unitPrice     Float    // 単価（税込）
  deliveryDays  Int      // 納期（日数）
  description   String?  // 説明

  @@unique([itemType, part])
}

// 店舗マスタ
model Store {
  id          String   @id @default(cuid())
  code        String   @unique // 店舗コード（shinjuku1, kichijoji, etc.）
  name        String   // 店舗名（新宿1、吉祥寺、など）
  region      String   // 地域（関東EAST、関東WEST、など）
  phoneNumber String?
  active      Boolean  @default(true)
}
```

### 4.2 TypeScript型定義

```typescript
// types/repair.ts

export type ItemType = 'jacket' | 'pants' | 'shirt' | 'vest' | 'chino'

export type RepairStatus = 'ok' | 'warning' | 'remake'

export interface RepairItem {
  itemType: ItemType
  adjustments: Adjustment[]
}

export interface Adjustment {
  part: string              // 部位名（例: shoulderWidth, bust）
  partLabel: string         // 表示名（例: 肩幅、バスト）
  changeValue: number       // 修正数値（cm）
  finalValue: number        // 仕上がり数値（cm）
  unitPrice: number         // 単価
  status: RepairStatus      // 限界値チェック結果
  limitMin: number          // 最小変更値
  limitMax: number          // 最大変更値
}

export type SupportType = 'within' | 'outside' // サポート内 | サポート外
export type RepairRecordStatus = 'in_progress' | 'completed' // 対応中 | 完了

export interface RepairFormData {
  // 基本情報
  store: string
  customerName: string
  orderDetailId?: string
  visitDate: Date
  supportType: SupportType
  status: RepairRecordStatus

  // お直し詳細
  items: RepairItem[]

  // 原因分析
  customerRequest?: string
  bodyChange: boolean
  rootCause?: string

  // 備考
  notes?: string
}

export interface RepairRecordWithCalculations extends RepairFormData {
  id: string
  totalCost: number
  deliveryDate: Date
  createdAt: Date
  updatedAt: Date
  userId: string
}
```

---

## 5. ビジネスロジック

### 5.1 限界値チェック

```typescript
// lib/repair-logic.ts

export function checkRepairLimit(
  itemType: ItemType,
  part: string,
  changeValue: number,
  repairLimits: RepairLimit[]
): RepairStatus {
  const limit = repairLimits.find(
    (l) => l.itemType === itemType && l.part === part
  )

  if (!limit) {
    return 'ok' // 限界値が未定義の場合はOKとする
  }

  const absChange = Math.abs(changeValue)

  if (absChange > limit.maxChange) {
    return 'remake' // 再製作必要
  }

  if (absChange >= limit.maxChange * 0.9) {
    return 'warning' // 限界値の90%を超えたら警告
  }

  return 'ok'
}
```

### 5.2 箇所数カウント

```typescript
export function countRepairPoints(items: RepairItem[]): number {
  let count = 0

  items.forEach((item) => {
    item.adjustments.forEach((adj) => {
      // 袖丈・裄丈・股下は左右であっても1箇所換算
      if (
        adj.part === 'sleeveLength' ||
        adj.part === 'inseam'
      ) {
        // 既にカウント済みならスキップ
        // （実際にはフロントエンドで制御）
        count += 0.5 // 左右で1箇所
      } else {
        count += 1
      }
    })
  })

  return Math.ceil(count) // 小数点切り上げ
}
```

### 5.3 料金計算

```typescript
export function calculateTotalCost(
  items: RepairItem[],
  supportType: SupportType
): number {
  // サポート内の場合は無料
  if (supportType === 'within') {
    return 0
  }

  // サポート外の場合は通常通り計算
  let total = 0

  items.forEach((item) => {
    item.adjustments.forEach((adj) => {
      total += adj.unitPrice
    })
  })

  // 税込で返す（単価が既に税込の場合）
  return total
}
```

### 5.4 納期計算

```typescript
export function calculateDeliveryDate(
  items: RepairItem[],
  visitDate: Date
): Date {
  const pointCount = countRepairPoints(items)

  // 上物と下物を判定
  const hasTopItem = items.some((item) =>
    ['jacket', 'vest', 'shirt'].includes(item.itemType)
  )
  const hasBottomItem = items.some((item) =>
    ['pants', 'chino'].includes(item.itemType)
  )

  let deliveryDays = 0

  if (hasTopItem && hasBottomItem) {
    // セットアップの場合
    if (pointCount <= 2) {
      deliveryDays = 12 // 上物2箇所以内の納期
    } else {
      deliveryDays = 17 // 上物3箇所以上の納期
    }
  } else if (hasTopItem) {
    // 上物のみ
    deliveryDays = pointCount <= 2 ? 12 : 17
  } else if (hasBottomItem) {
    // 下物のみ
    deliveryDays = pointCount <= 2 ? 11 : 16
  }

  const deliveryDate = new Date(visitDate)
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays)

  return deliveryDate
}
```

---

## 6. API設計

### 6.1 エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/repairs` | お直し記録一覧取得 |
| GET | `/api/repairs/[id]` | お直し記録詳細取得 |
| POST | `/api/repairs` | お直し記録作成 |
| PUT | `/api/repairs/[id]` | お直し記録更新 |
| DELETE | `/api/repairs/[id]` | お直し記録削除 |
| GET | `/api/repair-limits` | 限界値マスタ取得 |
| GET | `/api/stores` | 店舗マスタ取得 |
| POST | `/api/repairs/import` | 既存データインポート |

### 6.2 APIレスポンス例

#### GET `/api/repairs`
```json
{
  "repairs": [
    {
      "id": "clx...",
      "store": "新宿1",
      "customerName": "山田太郎",
      "visitDate": "2025-12-01T10:00:00Z",
      "totalCost": 8800,
      "deliveryDate": "2025-12-12T00:00:00Z",
      "createdAt": "2025-12-01T10:30:00Z"
    }
  ],
  "total": 150
}
```

#### POST `/api/repairs`
Request:
```json
{
  "store": "新宿1",
  "customerName": "山田太郎",
  "orderDetailId": "ABC123",
  "visitDate": "2025-12-01T10:00:00Z",
  "items": [
    {
      "itemType": "jacket",
      "adjustments": [
        {
          "part": "shoulderWidth",
          "partLabel": "肩幅",
          "changeValue": -2,
          "finalValue": 44,
          "unitPrice": 4400,
          "status": "ok"
        }
      ]
    }
  ],
  "customerRequest": "もう少し肩回りをタイトにしたい",
  "bodyChange": false,
  "rootCause": "好みの変化"
}
```

Response:
```json
{
  "id": "clx...",
  "totalCost": 4400,
  "deliveryDate": "2025-12-12T00:00:00Z",
  "createdAt": "2025-12-01T10:30:00Z"
}
```

---

## 7. UI/UXデザイン方針

### 7.1 デザインシステム

- **カラーパレット**:
  - プライマリ: ネイビー系（FABRIC TOKYOブランドカラー）
  - セカンダリ: グレー系
  - アクセント: ゴールド系
  - ステータス:
    - 成功/OK: 緑（#10B981）
    - 警告: 黄（#F59E0B）
    - エラー/再製作: 赤（#EF4444）

- **タイポグラフィ**:
  - フォント: Noto Sans JP（日本語）
  - 見出し: 16-24px, Semi-bold
  - 本文: 14-16px, Regular

- **コンポーネント**: shadcn/ui を使用
  - Button, Input, Select, Card, Table, Dialog など

### 7.2 レスポンシブブレークポイント

- **Mobile**: < 640px
  - シングルカラムレイアウト
  - スタック表示
- **Tablet**: 640px - 1024px
  - 2カラムレイアウト
- **Desktop**: > 1024px
  - 3カラムレイアウト（一覧画面）
  - フルワイドフォーム（登録画面）

### 7.3 主要画面のワイヤーフレーム

#### お直し一覧画面（デスクトップ）
```
┌─────────────────────────────────────────────────────┐
│  FABRIC TOKYO お直し管理                [ユーザー名 ▼] │
├─────────────────────────────────────────────────────┤
│  [+ 新規お直し登録]                                   │
│                                                     │
│  検索: [________]  店舗: [全て▼]  期間: [今月▼]       │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 店舗   顧客名    来店日      総額    納期    詳細  │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 新宿1  山田太郎  2025/12/01  ¥8,800  12/12  [>] │  │
│  │ 吉祥寺 鈴木花子  2025/12/01  ¥4,400  12/11  [>] │  │
│  │ ...                                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ページ: [1] [2] [3] ... [10]                       │
└─────────────────────────────────────────────────────┘
```

#### お直し登録画面（ステップ2: アイテム選択）
```
┌─────────────────────────────────────────────────────┐
│  お直し登録                                   [× 閉じる] │
├─────────────────────────────────────────────────────┤
│  ① 基本情報  ② アイテム選択  ③ お直し箇所  ④ 原因分析  │
│  ─────────  ───────────  ──────────  ──────────   │
│                                                     │
│  アイテムを選択してください                           │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ ジャケット  │  │  パンツ   │  │  シャツ   │            │
│  └─────────┘  └─────────┘  └─────────┘            │
│                                                     │
│  ┌─────────┐  ┌─────────┐                         │
│  │  ベスト   │  │   チノ    │                         │
│  └─────────┘  └─────────┘                         │
│                                                     │
│                                   [戻る]  [次へ >]  │
└─────────────────────────────────────────────────────┘
```

---

## 8. 技術実装詳細

### 8.1 フォルダ構成

```
fabric-tools/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── repairs/
│   │   │   ├── page.tsx              # 一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # 新規登録
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # 詳細
│   │   │       └── edit/
│   │   │           └── page.tsx      # 編集
│   │   └── page.tsx                  # ダッシュボード（リダイレクト）
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── repairs/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── import/
│   │   │       └── route.ts
│   │   ├── repair-limits/
│   │   │   └── route.ts
│   │   └── stores/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx                      # ランディング
├── components/
│   ├── ui/                           # shadcn/ui コンポーネント
│   ├── repairs/
│   │   ├── RepairList.tsx
│   │   ├── RepairForm/
│   │   │   ├── Step1BasicInfo.tsx
│   │   │   ├── Step2ItemSelect.tsx
│   │   │   ├── Step3Adjustments.tsx
│   │   │   ├── Step4Analysis.tsx
│   │   │   ├── Step5Notes.tsx
│   │   │   └── Step6Confirm.tsx
│   │   ├── RepairDetail.tsx
│   │   └── RepairCard.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts                       # NextAuth設定
│   ├── repair-logic.ts               # ビジネスロジック
│   └── utils.ts
├── types/
│   ├── repair.ts
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       # マスタデータ投入
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

### 8.2 主要ライブラリ

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "@prisma/client": "^5.18.0",
    "next-auth": "^4.24.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "^1.1.0",
    "lucide-react": "^0.424.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "prisma": "^5.18.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0"
  }
}
```

---

## 9. データベースセットアップ

### 9.1 初期マスタデータ

#### 店舗マスタ
```typescript
// prisma/seed.ts
const stores = [
  { code: 'shinjuku1', name: '新宿1', region: '関東EAST' },
  { code: 'shinjuku2', name: '新宿2', region: '関東EAST' },
  { code: 'shinjuku3', name: '新宿3', region: '関東EAST' },
  { code: 'kichijoji', name: '吉祥寺', region: '関東EAST' },
  { code: 'nihonbashi', name: '日本橋', region: '関東EAST' },
  { code: 'nihonbashi2', name: '日本橋2', region: '関東EAST' },
  { code: 'omotesando', name: '表参道', region: '関東EAST' },
  { code: 'yurakucho1', name: '有楽町1', region: '関東EAST' },
  { code: 'yurakucho2', name: '有楽町2', region: '関東EAST' },
  { code: 'yurakucho3', name: '有楽町3', region: '関東EAST' },
  { code: 'yokohama', name: '横浜', region: '関東EAST' },
  { code: 'yokohama2', name: '横浜2', region: '関東EAST' },
  { code: 'womens', name: 'ウィメンズ', region: '関東EAST' },
]
```

#### 限界値マスタ（サンプル）
```typescript
const repairLimits = [
  // ジャケット
  { itemType: 'jacket', part: 'shoulderWidth', partLabel: '肩幅', minChange: -3, maxChange: 3, unitPrice: 4400, deliveryDays: 12 },
  { itemType: 'jacket', part: 'bust', partLabel: 'バスト', minChange: -5, maxChange: 5, unitPrice: 4400, deliveryDays: 12 },
  { itemType: 'jacket', part: 'waist', partLabel: 'ウエスト', minChange: -5, maxChange: 5, unitPrice: 4400, deliveryDays: 12 },
  { itemType: 'jacket', part: 'sleeveLength', partLabel: '袖丈', minChange: -5, maxChange: 3, unitPrice: 3300, deliveryDays: 10 },
  { itemType: 'jacket', part: 'bodyLength', partLabel: '着丈', minChange: -3, maxChange: 3, unitPrice: 4400, deliveryDays: 12 },

  // パンツ
  { itemType: 'pants', part: 'waist', partLabel: 'ウエスト', minChange: -5, maxChange: 5, unitPrice: 3300, deliveryDays: 11 },
  { itemType: 'pants', part: 'rise', partLabel: '股上', minChange: -3, maxChange: 3, unitPrice: 4400, deliveryDays: 11 },
  { itemType: 'pants', part: 'inseam', partLabel: '股下', minChange: -10, maxChange: 5, unitPrice: 2200, deliveryDays: 8 },
  { itemType: 'pants', part: 'thigh', partLabel: '渡り幅', minChange: -3, maxChange: 3, unitPrice: 4400, deliveryDays: 11 },

  // 以下、シャツ、ベスト、チノも同様に定義
]
```

---

## 10. 開発スケジュール（Phase 1: 2-3週間）

### Week 1: セットアップ＆基礎実装
- Day 1-2: プロジェクトセットアップ
  - Next.js プロジェクト作成
  - Prisma セットアップ
  - Supabase/PostgreSQL 接続
  - shadcn/ui インストール
  - NextAuth設定

- Day 3-4: データベース＆マスタデータ
  - Prismaスキーマ実装
  - マイグレーション実行
  - シードデータ投入

- Day 5-7: 認証＆レイアウト
  - Google OAuth実装
  - ヘッダー・サイドバー実装
  - レスポンシブレイアウト

### Week 2: コア機能実装
- Day 8-10: お直し一覧画面
  - API実装（GET /api/repairs）
  - 一覧表示コンポーネント
  - シンプルな検索・フィルター

- Day 11-14: お直し登録・編集画面
  - ステップ形式フォーム実装
  - バリデーション
  - リアルタイム計算（料金・納期）
  - 限界値チェック

### Week 3: 仕上げ＆テスト
- Day 15-16: お直し詳細画面
  - 詳細表示コンポーネント
  - 編集・削除機能

- Day 17-18: データインポート
  - Excel読み込み機能
  - データ変換ロジック

- Day 19-21: テスト＆バグ修正
  - 動作確認
  - レスポンシブテスト
  - バグ修正
  - ドキュメント整備

---

## 11. デプロイ

### 11.1 デプロイ先
- **Vercel**（推奨）
  - Next.js に最適化
  - 自動デプロイ（GitHub連携）
  - 環境変数管理

### 11.2 環境変数
```env
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 11.3 本番デプロイチェックリスト
- [ ] DATABASE_URL を本番DBに変更
- [ ] NEXTAUTH_URL を本番URLに変更
- [ ] Google OAuth の承認済みリダイレクトURIに本番URLを追加
- [ ] Prisma マイグレーション実行
- [ ] シードデータ投入
- [ ] 本番環境でテスト

---

## 12. 今後の拡張（Phase 2以降）

- サイズ更新シート機能
- 高度な検索・フィルタリング（Elasticsearch等）
- CSV/Excelエクスポート
- テンプレート自動生成（PDF）
- ダッシュボード・統計
- 権限管理
- 通知機能
- モバイルアプリ（React Native）

---

## 13. まとめ

このMVPでは、お直し管理の基本機能を実装し、店舗スタッフが日常業務で使えるレベルのWebアプリケーションを構築します。

**重点ポイント**:
1. ✅ シンプルで直感的なUI/UX
2. ✅ リアルタイム限界値チェック・料金計算
3. ✅ レスポンシブデザイン（スマホ対応）
4. ✅ 既存データのインポート機能

Phase 1完了後、ユーザーフィードバックを元にPhase 2の機能を実装していきます。
