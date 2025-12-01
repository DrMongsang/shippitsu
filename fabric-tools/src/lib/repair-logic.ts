// お直しシートのビジネスロジック

import {
  type ItemType,
  type RepairItem,
  type RepairStatus,
  type SupportType,
} from '@/types/repair'

export interface RepairLimit {
  itemType: string
  part: string
  minChange: number
  maxChange: number
  unitPrice: number
  deliveryDays: number
}

/**
 * 限界値チェック
 */
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

/**
 * 箇所数カウント
 */
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

/**
 * 料金計算
 */
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

/**
 * 納期計算
 */
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

/**
 * お直し記録のサマリーを生成
 */
export function generateRepairSummary(
  items: RepairItem[],
  supportType: SupportType
): string {
  const pointCount = countRepairPoints(items)
  const totalCost = calculateTotalCost(items, supportType)

  const itemsText = items
    .map((item) => {
      const adjustmentsText = item.adjustments
        .map((adj) => `${adj.partLabel}: ${adj.changeValue > 0 ? '+' : ''}${adj.changeValue}cm`)
        .join(', ')
      return `${getItemTypeLabel(item.itemType)}: ${adjustmentsText}`
    })
    .join('\n')

  const costText = supportType === 'within' ? '無料（サポート内）' : `¥${totalCost.toLocaleString()}`

  return `【お直し内容】
${itemsText}

【箇所数】${pointCount}箇所
【料金】${costText}`
}

/**
 * アイテムタイプの表示名を取得
 */
export function getItemTypeLabel(itemType: ItemType): string {
  const labels: Record<ItemType, string> = {
    jacket: 'ジャケット',
    pants: 'パンツ',
    shirt: 'シャツ',
    vest: 'ベスト',
    chino: 'チノ',
  }
  return labels[itemType]
}
