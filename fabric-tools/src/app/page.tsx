import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              FABRIC TOKYO
            </h1>
            <p className="text-xl text-slate-600">
              お直し管理ツール
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>お直しシート</CardTitle>
                <CardDescription>
                  納品済み商品のお直し管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 mb-4">
                  <li>✓ お直し記録の登録・管理</li>
                  <li>✓ 限界値チェック</li>
                  <li>✓ 料金・納期自動計算</li>
                  <li>✓ 店舗間データ共有</li>
                </ul>
                <Link href="/repairs">
                  <Button className="w-full">
                    お直しシートを開く
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>サイズ更新シート</CardTitle>
                <CardDescription>
                  顧客の基本サイズ情報更新
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 mb-4">
                  <li>✓ サイズ更新記録</li>
                  <li>✓ アイテム別サイズ管理</li>
                  <li>✓ 電話対応記録</li>
                  <li>✓ テンプレート選択</li>
                </ul>
                <Button className="w-full" disabled>
                  Phase 2で実装予定
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-sm text-slate-500">
            <p>店舗スタッフ向け管理システム MVP v1.0</p>
            <p className="mt-2">Phase 1: お直しシート機能</p>
          </div>
        </div>
      </div>
    </div>
  )
}
