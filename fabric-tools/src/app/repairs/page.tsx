import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RepairsPage() {
  // TODO: データベースから取得（現在はダミーデータ）
  const repairs = [
    {
      id: '1',
      store: '新宿1',
      customerName: '山田太郎',
      visitDate: new Date('2025-12-01'),
      totalCost: 8800,
      deliveryDate: new Date('2025-12-12'),
      status: 'in_progress',
    },
    {
      id: '2',
      store: '吉祥寺',
      customerName: '鈴木花子',
      visitDate: new Date('2025-12-01'),
      totalCost: 0,
      deliveryDate: new Date('2025-12-11'),
      status: 'in_progress',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold text-slate-900">
                FABRIC TOKYO
              </Link>
              <p className="text-sm text-slate-600">お直し管理ツール</p>
            </div>
            <div className="flex gap-4">
              <Link href="/repairs/new">
                <Button>
                  + 新規お直し登録
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            お直し一覧
          </h1>
          <p className="text-slate-600">
            全 {repairs.length} 件のお直し記録
          </p>
        </div>

        {/* フィルター（TODO: Phase 2で実装） */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="顧客名で検索..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md"
            />
            <select className="px-4 py-2 border border-slate-300 rounded-md">
              <option value="">全店舗</option>
              <option value="shinjuku1">新宿1</option>
              <option value="kichijoji">吉祥寺</option>
            </select>
            <select className="px-4 py-2 border border-slate-300 rounded-md">
              <option value="">全ステータス</option>
              <option value="in_progress">対応中</option>
              <option value="completed">完了</option>
            </select>
          </div>
        </div>

        {/* お直し一覧 */}
        <div className="space-y-4">
          {repairs.map((repair) => (
            <Card key={repair.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {repair.customerName}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      店舗: {repair.store} | 来店日: {repair.visitDate.toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">
                      {repair.totalCost === 0 ? '無料' : `¥${repair.totalCost.toLocaleString()}`}
                    </div>
                    <div className="text-sm text-slate-600">
                      納期: {repair.deliveryDate.toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      repair.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {repair.status === 'completed' ? '完了' : '対応中'}
                    </span>
                    {repair.totalCost === 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        サポート内
                      </span>
                    )}
                  </div>
                  <Link href={`/repairs/${repair.id}`}>
                    <Button variant="outline" size="sm">
                      詳細を見る →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {repairs.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                まだお直し記録がありません
              </p>
              <Link href="/repairs/new">
                <Button>
                  最初のお直しを登録する
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
