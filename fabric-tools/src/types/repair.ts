// お直しシートの型定義

export type ItemType = 'jacket' | 'pants' | 'shirt' | 'vest' | 'chino'

export type RepairStatus = 'ok' | 'warning' | 'remake'

export type SupportType = 'within' | 'outside' // サポート内 | サポート外

export type RepairRecordStatus = 'in_progress' | 'completed' // 対応中 | 完了

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

// アイテム別の部位定義
export interface PartDefinition {
  part: string
  partLabel: string
  defaultPrice: number
}

export const ITEM_PARTS: Record<ItemType, PartDefinition[]> = {
  jacket: [
    { part: 'shoulderWidth', partLabel: '肩幅', defaultPrice: 4400 },
    { part: 'bust', partLabel: 'バスト', defaultPrice: 4400 },
    { part: 'waist', partLabel: 'ウエスト', defaultPrice: 4400 },
    { part: 'sleeveLength', partLabel: '袖丈', defaultPrice: 3300 },
    { part: 'bodyLength', partLabel: '着丈', defaultPrice: 4400 },
  ],
  pants: [
    { part: 'waist', partLabel: 'ウエスト', defaultPrice: 3300 },
    { part: 'rise', partLabel: '股上', defaultPrice: 4400 },
    { part: 'inseam', partLabel: '股下', defaultPrice: 2200 },
    { part: 'thigh', partLabel: '渡り幅', defaultPrice: 4400 },
    { part: 'knee', partLabel: 'ひざ幅', defaultPrice: 4400 },
    { part: 'hemWidth', partLabel: 'すそ口幅', defaultPrice: 4400 },
  ],
  shirt: [
    { part: 'shoulderWidth', partLabel: '肩幅', defaultPrice: 3300 },
    { part: 'bust', partLabel: 'バスト', defaultPrice: 3300 },
    { part: 'waist', partLabel: 'ウエスト', defaultPrice: 3300 },
    { part: 'neckCircumference', partLabel: '首まわり', defaultPrice: 2200 },
    { part: 'sleeveLength', partLabel: '裄丈', defaultPrice: 2200 },
    { part: 'bodyLength', partLabel: '着丈', defaultPrice: 3300 },
  ],
  vest: [
    { part: 'bust', partLabel: 'バスト', defaultPrice: 3300 },
    { part: 'waist', partLabel: 'ウエスト', defaultPrice: 3300 },
    { part: 'bodyLength', partLabel: '着丈', defaultPrice: 3300 },
  ],
  chino: [
    { part: 'waist', partLabel: 'ウエスト', defaultPrice: 3300 },
    { part: 'rise', partLabel: '股上', defaultPrice: 4400 },
    { part: 'inseam', partLabel: '股下', defaultPrice: 2200 },
    { part: 'thigh', partLabel: '渡り幅', defaultPrice: 4400 },
  ],
}

// テンプレートテキスト
export const CUSTOMER_REQUEST_TEMPLATES = [
  'サイズが合わない',
  'シルエットを変更したい',
  '体型に合わせて調整したい',
  'その他',
]

export const ROOT_CAUSE_TEMPLATES = [
  'お客様のご要望による変更',
  '体型変化による調整',
  'ヒアリング不足',
  '要望のすり合わせ不足',
  '採寸ミス',
  'その他',
]

// 店舗リスト
export const STORES = [
  { code: 'shinjuku1', name: '新宿1' },
  { code: 'shinjuku2', name: '新宿2' },
  { code: 'shinjuku3', name: '新宿3' },
  { code: 'kichijoji', name: '吉祥寺' },
  { code: 'nihonbashi', name: '日本橋' },
  { code: 'nihonbashi2', name: '日本橋2' },
  { code: 'omotesando', name: '表参道' },
  { code: 'yurakucho1', name: '有楽町1' },
  { code: 'yurakucho2', name: '有楽町2' },
  { code: 'yurakucho3', name: '有楽町3' },
  { code: 'yokohama', name: '横浜' },
  { code: 'yokohama2', name: '横浜2' },
  { code: 'womens', name: 'ウィメンズ' },
]
