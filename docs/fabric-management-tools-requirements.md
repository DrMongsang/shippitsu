# FABRIC TOKYO 店舗スタッフ向け管理ツール 要件定義書

## 1. 概要

### 1.1 目的
現在Googleスプレッドシートで管理している以下の2つのツールをWebアプリケーション化する：
- **お直しシート**: 納品済み商品のお直し管理
- **サイズ更新シート**: 顧客の基本サイズ情報更新管理

### 1.2 ユーザー
- **メインユーザー**: FABRIC TOKYO店舗スタッフ
- **使用環境**: Google Chrome
- **認証**: 全員がGoogleアカウントを保有

### 1.3 現状の課題
- スプレッドシートでの運用が煩雑
- データ入力ミスが発生しやすい
- 限界値チェックや料金計算が複雑
- 店舗間でのデータ共有・検索が困難

---

## 2. お直しシート の要件

### 2.1 機能要件

#### 2.1.1 お直し対応記録
- **店舗選択**: 新宿1/2/3、吉祥寺、日本橋、表参道、有楽町、横浜、ウィメンズなど
- **顧客情報入力**:
  - 顧客名
  - 来店日時
  - 注文詳細ID
- **お直し詳細入力**:
  - アイテム選択（ジャケット、パンツ、シャツ、ベスト、チノなど）
  - 部位選択（肩幅、バスト、ウエスト、袖丈、股下など）
  - 修正数値（例: -2cm, +1cm）
  - 仕上がり数値（修正後の最終数値）
- **原因分析**:
  - お客様のご要望
  - 体型変動の有無
  - お直しが起きた原因（ヒアリング不足、要望のすり合わせ不足など）
- **備考・エピソード**: フリーテキスト

#### 2.1.2 限界値チェック機能
- **データベース参照**: アイテム別お直し限界値マスタを参照
- **自動判定**:
  - ✅ お直し可能
  - ⚠️ 要確認（限界値ギリギリ）
  - ❌ 再製作必要
- **判定ロジック**: 各アイテム・部位ごとの許容範囲をチェック

#### 2.1.3 料金計算機能
- **箇所数カウント**: 自動集計（袖丈・裄丈・股下は左右で1箇所換算）
- **料金計算**:
  - 1箇所あたりの基本料金
  - 複数箇所割引
  - サポート外お直し費用
- **税込表示**: 自動計算
- **配送料**: お預かり方法（店舗 or 配送）と注文詳細ID数で計算

#### 2.1.4 納期計算機能
- **箇所数による納期判定**:
  - 上物（ジャケット）: 2箇所以内 vs 3箇所以上
  - 下物（パンツ）: 2箇所以内 vs 3箇所以上
- **セットアップ対応**: 上物・下物の納期を考慮
- **納期表示**: 具体的な納品予定日を表示

#### 2.1.5 テンプレート機能
- **CS確認依頼テンプレート**: 自動生成
- **お客様詳細・管理メモテンプレート**: 定型フォーマット
- **預かり票印刷**: アイテム別（スーツ、シャツ）

#### 2.1.6 検索・閲覧機能
- **フィルター**:
  - 店舗別
  - 日付範囲
  - 顧客名
  - ステータス（対応中、完了、CS確認待ちなど）
- **ソート**: 各列でソート可能
- **エクスポート**: CSV/Excelでダウンロード

### 2.2 非機能要件

#### 2.2.1 パフォーマンス
- ページ読み込み: 3秒以内
- 検索結果表示: 2秒以内

#### 2.2.2 セキュリティ
- Google OAuth認証
- 店舗別のアクセス制限（必要に応じて）
- データのバックアップ（日次）

#### 2.2.3 ユーザビリティ
- レスポンシブデザイン（PC、タブレット対応）
- 直感的なUI/UX
- エラーメッセージの明確化

---

## 3. サイズ更新シート の要件

### 3.1 機能要件

#### 3.1.1 サイズ更新記録
- **店舗選択**: 同上
- **顧客情報**:
  - 顧客名
  - 対応日
  - 対応者
- **サイズ更新理由**:
  - 体型変化
  - 久しぶりの来店・念のため確認
  - その他（フリーテキスト）
- **ヌード寸の変化**: あり/なし

#### 3.1.2 アイテム別サイズ更新
各アイテムごとに更新項目を入力：

**ジャケット/ジャコット**:
- 肩幅、バスト、ウエスト、袖丈、着丈
- 肩パッド、なで肩、怒り肩、反身、屈身
- 衿ミツ出し/入れ、背幅、けまわし、袖逃し、打ち合いだし、アーム前クリなど

**スラックス/カジュアルパンツ**:
- パンツウエスト、股上、股下、渡り幅、ひざ幅、すそ口幅
- 出尻、平尻、O脚、前股上

**ベスト**:
- バスト、ウエスト、着丈
- 怒り肩、なで肩、反身、屈身

**シャツ（フォーマル/タックアウト）**:
- 肩幅、バスト（長袖/半袖）、ウエスト、首まわり、ヒップ仕上がり寸
- 裄丈（長袖）、カフスまわり、袖口まわり、アームホール、着丈
- なで肩、怒り肩、反身、屈身、前丈前幅

**ポロシャツ**:
- 肩幅、バスト、ウエスト、首まわり、ヒップ仕上がり寸
- 裄丈（長袖）、袖口まわり、アームホール、着丈
- なで肩、怒り肩、反身、屈身、前丈前幅

#### 3.1.3 iKnow連携
- **更新方法選択**:
  - iKnowで全体更新（ロジック通り）
  - 個別項目のみ更新
- **変更値入力**: 各項目の変更値（+/- cm）
- **前回のお好み**: そのまま / 変更あり

#### 3.1.4 電話対応記録
- 対応日、対応者
- 受電内容
- お伝えした内容
- 対応着地
- 次回対応者への引継ぎ事項

#### 3.1.5 検索・閲覧機能
お直しシートと同様

### 3.2 非機能要件
お直しシートと同様

---

## 4. 技術スタック（提案）

### 4.1 フロントエンド
- **Next.js 14+** (App Router)
  - React Server Components
  - TypeScript
- **UI Framework**:
  - Tailwind CSS
  - shadcn/ui（高品質なコンポーネント）
- **フォーム管理**:
  - React Hook Form
  - Zod（バリデーション）
- **状態管理**:
  - Zustand または React Query

### 4.2 バックエンド
- **Next.js API Routes** または **tRPC**
- **ORM**: Prisma
- **データベース**:
  - PostgreSQL（Supabase）
  - または Firebase Firestore

### 4.3 認証
- **NextAuth.js** with Google OAuth

### 4.4 ホスティング
- **Vercel**（Next.jsに最適化）
- または **Firebase Hosting + Cloud Functions**

### 4.5 開発ツール
- **TypeScript**: 型安全性
- **ESLint + Prettier**: コード品質
- **Jest + React Testing Library**: テスト

---

## 5. データモデル（案）

### 5.1 お直しシート

```typescript
interface RepairRecord {
  id: string
  createdAt: Date
  updatedAt: Date

  // 基本情報
  store: string  // 店舗
  customerName: string
  orderDetailId: string
  visitDate: Date

  // お直し詳細
  items: RepairItem[]

  // 原因分析
  customerRequest: string  // お客様のご要望
  bodyChange: boolean  // 体型変動の有無
  rootCause: string  // 原因

  // 備考
  notes: string
  episodes: string

  // ステータス
  status: 'in_progress' | 'cs_review' | 'completed'

  // 料金・納期
  totalCost: number
  deliveryDate: Date
}

interface RepairItem {
  itemType: 'jacket' | 'pants' | 'shirt' | 'vest' | 'chino'
  adjustments: Adjustment[]
  repairType: 'repair' | 'remake'  // お直し or 再製作
}

interface Adjustment {
  part: string  // 肩幅、バスト、ウエストなど
  changeValue: number  // 変更値（cm）
  finalValue: number  // 仕上がり数値
  unitPrice: number  // 単価
}
```

### 5.2 サイズ更新シート

```typescript
interface SizeUpdateRecord {
  id: string
  createdAt: Date
  updatedAt: Date

  // 基本情報
  store: string
  customerName: string
  updateDate: Date
  staffName: string

  // 更新理由
  updateReason: string
  bodyChange: boolean  // ヌード寸の変化

  // アイテム別サイズ
  jacketSizes?: JacketSizes
  pantsSizes?: PantsSizes
  vestSizes?: VestSizes
  shirtSizes?: ShirtSizes
  poloShirtSizes?: PoloShirtSizes

  // iKnow連携
  iknowUpdateType: 'full_auto' | 'partial'  // 全体更新 or 個別

  // 電話対応記録
  phoneLog?: PhoneLog

  // その他備考
  notes: string
}

interface JacketSizes {
  shoulderWidth?: number
  bust?: number
  waist?: number
  sleeveLength?: number
  bodyLength?: number
  // ... その他の項目
}

// 同様に PantsSizes, VestSizes, ShirtSizes, PoloShirtSizes を定義

interface PhoneLog {
  date: Date
  staff: string
  incomingContent: string
  response: string
  resolution: string
  handover: string
}
```

### 5.3 マスタデータ

```typescript
// お直し限界値マスタ
interface RepairLimitMaster {
  itemType: string
  part: string
  minChange: number  // 最小変更値（cm）
  maxChange: number  // 最大変更値（cm）
  unitPrice: number  // 単価
  deliveryDays: number  // 納期（日数）
}

// 店舗マスタ
interface StoreMaster {
  id: string
  name: string
  region: string
  phoneNumber: string
}
```

---

## 6. 実装フェーズ（確定版）

### Phase 1: お直しシートMVP 🎯 **← 最優先**
**期間**: 2-3週間
**目標**: 基本的なお直し管理機能を実装し、現場で使えるレベルにする

- **お直し記録機能**:
  - お直し記録の登録・閲覧・編集
  - アイテム別お直し項目の入力
  - 修正数値と仕上がり数値の管理
  - 原因分析（お客様要望、体型変動、原因）
  - 備考・エピソード記録

- **限界値チェック**:
  - アイテム別お直し限界値マスタ
  - お直し可能/要確認/再製作必要の自動判定

- **料金・納期計算**:
  - 箇所数自動カウント
  - 料金自動計算（税込表示）
  - 納期自動計算

- **基本UI**:
  - Google OAuth認証（簡易版）
  - レスポンシブデザイン（PC・タブレット・スマホ対応）
  - 直感的な入力フォーム

- **データ移行**:
  - 既存スプレッドシートからのデータインポート機能
  - 動作確認後、不要なら削除可能

### Phase 2: 機能拡張
**期間**: 2-3週間
- サイズ更新シート機能
- 検索・フィルタリング強化
- CSV/Excelエクスポート
- テンプレート自動生成（CS確認依頼、預かり票など）
- 店舗間データ共有の最適化

### Phase 3: 高度な機能（将来的に検討）
**期間**: 2-3週間
- ダッシュボード（統計・分析）
- 通知機能（納期アラートなど）
- 権限管理（店舗別アクセス制御）
- より高度なレポート機能

---

## 7. 次のステップ

1. **要件の詳細確認**
   - 不明点・追加要件のヒアリング
   - 優先順位の決定

2. **技術スタックの決定**
   - Next.js + Supabase
   - または Next.js + Firebase
   - その他の選択肢の検討

3. **デザインモックアップ作成**
   - 主要画面のワイヤーフレーム
   - UI/UXの確認

4. **開発環境セットアップ**
   - リポジトリ準備
   - CI/CDパイプライン

5. **Phase 1開発開始**

---

## 8. 確定した要件（ユーザー回答済み）

### 8.1 優先順位
✅ **Phase 1: お直しシートから着手**
- サイズ更新シートはPhase 2以降

### 8.2 データ移行
✅ **まず移行してみて、不要なら削除**
- 既存データのインポート機能を実装
- 動作確認後に判断

### 8.3 外部システム連携
✅ **iKnow連携: 不可**
- API連携なし
- 将来的にも連携の予定なし

### 8.4 アクセス制御
✅ **Phase 1では不要**
- 全スタッフが全データにアクセス可能
- 将来的に必要になれば Phase 3 で実装

### 8.5 スマホ対応
✅ **あったらうれしい（優先度: 中）**
- レスポンシブデザインを採用
- PC・タブレット・スマホすべてに対応

---

## 9. 未確認事項（Phase 1実装前に確認）

### 9.1 お直しシートについて
1. 店舗間でデータを共有しますか？それとも店舗ごとに分離？
2. CS（カスタマーサポート）チームとの連携フローは？
3. 「サポート外お直し」の費用計算ルールの詳細は？
4. ステータス管理は必要ですか？（対応中、完了、CS確認待ちなど）

### 9.2 共通
1. 既存の社内システムとの連携は必要ですか？
2. データのエクスポート形式は？（Excel、CSV、PDF など）
3. 多言語対応は必要ですか？（日本語のみでOK？）

---

## 10. 参考資料

- `articles/【関東EAST】お直し対応シート.xlsx` - 現行のお直しシート
- `articles/有楽町月報.xlsx` - サイズ更新テンプレートを含む月報
