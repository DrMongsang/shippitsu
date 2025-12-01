'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { STORES, CUSTOMER_REQUEST_TEMPLATES, ROOT_CAUSE_TEMPLATES, ITEM_PARTS, type ItemType, type SupportType } from '@/types/repair'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

export default function NewRepairPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  // フォームデータ
  const [formData, setFormData] = useState({
    // Step 1: 基本情報
    store: '',
    customerName: '',
    orderDetailId: '',
    visitDate: new Date().toISOString().split('T')[0],
    supportType: 'within' as SupportType,

    // Step 2: アイテム選択
    selectedItem: '' as ItemType | '',

    // Step 3: お直し箇所（後で実装）
    adjustments: [] as any[],

    // Step 4: 原因分析
    customerRequest: '',
    bodyChange: false,
    rootCause: '',

    // Step 5: 備考
    notes: '',
  })

  const totalSteps = 6

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // TODO: APIに送信
    console.log('フォームデータ:', formData)
    alert('お直し記録を保存しました（仮）')
    router.push('/repairs')
  }

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
            <Link href="/repairs">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              新規お直し登録
            </h1>
            <p className="text-slate-600">
              ステップ {currentStep} / {totalSteps}
            </p>
          </div>

          {/* ステップインジケーター */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                '基本情報',
                'アイテム選択',
                'お直し箇所',
                '原因分析',
                '備考',
                '確認',
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index + 1 < currentStep
                        ? 'bg-green-500 text-white'
                        : index + 1 === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1 < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs mt-2 text-center">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* フォームコンテンツ */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && '基本情報'}
                {currentStep === 2 && 'アイテム選択'}
                {currentStep === 3 && 'お直し箇所'}
                {currentStep === 4 && '原因分析'}
                {currentStep === 5 && '備考'}
                {currentStep === 6 && '確認'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step 1: 基本情報 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="store">店舗 *</Label>
                    <Select
                      value={formData.store}
                      onValueChange={(value) =>
                        setFormData({ ...formData, store: value })
                      }
                    >
                      <SelectTrigger id="store">
                        <SelectValue placeholder="店舗を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map((store) => (
                          <SelectItem key={store.code} value={store.code}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customerName">顧客名 *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      placeholder="山田太郎"
                    />
                  </div>

                  <div>
                    <Label htmlFor="orderDetailId">注文詳細ID</Label>
                    <Input
                      id="orderDetailId"
                      value={formData.orderDetailId}
                      onChange={(e) =>
                        setFormData({ ...formData, orderDetailId: e.target.value })
                      }
                      placeholder="ABC123"
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitDate">来店日時 *</Label>
                    <Input
                      id="visitDate"
                      type="date"
                      value={formData.visitDate}
                      onChange={(e) =>
                        setFormData({ ...formData, visitDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>サポート区分 *</Label>
                    <RadioGroup
                      value={formData.supportType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, supportType: value as SupportType })
                      }
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="within" id="within" />
                        <Label htmlFor="within" className="font-normal cursor-pointer">
                          サポート内（無料）
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="outside" id="outside" />
                        <Label htmlFor="outside" className="font-normal cursor-pointer">
                          サポート外（有料）
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Step 2: アイテム選択 */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 mb-4">
                    お直しするアイテムを選択してください
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { type: 'jacket', label: 'ジャケット / ジャコット' },
                      { type: 'pants', label: 'スラックス / カジュアルパンツ' },
                      { type: 'shirt', label: 'シャツ' },
                      { type: 'vest', label: 'ベスト' },
                      { type: 'chino', label: 'チノ' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() =>
                          setFormData({ ...formData, selectedItem: item.type as ItemType })
                        }
                        className={`p-6 rounded-lg border-2 transition-all ${
                          formData.selectedItem === item.type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg font-medium">{item.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: お直し箇所（簡易版） */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 mb-4">
                    お直し箇所の詳細入力（実装中）
                  </p>
                  {formData.selectedItem && ITEM_PARTS[formData.selectedItem] && (
                    <div className="space-y-3">
                      {ITEM_PARTS[formData.selectedItem].map((part) => (
                        <div key={part.part} className="p-4 border rounded-lg">
                          <Label>{part.partLabel}</Label>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <Label className="text-xs text-slate-600">修正数値 (cm)</Label>
                              <Input type="number" placeholder="0" />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">仕上がり数値 (cm)</Label>
                              <Input type="number" placeholder="0" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!formData.selectedItem && (
                    <p className="text-sm text-slate-500">
                      まずアイテムを選択してください
                    </p>
                  )}
                </div>
              )}

              {/* Step 4: 原因分析 */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerRequest">お客様のご要望</Label>
                    <Select
                      value={formData.customerRequest}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customerRequest: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="テンプレートを選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_REQUEST_TEMPLATES.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      id="customerRequest"
                      value={formData.customerRequest}
                      onChange={(e) =>
                        setFormData({ ...formData, customerRequest: e.target.value })
                      }
                      placeholder="お客様のご要望を入力..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>体型変動の有無</Label>
                    <RadioGroup
                      value={formData.bodyChange ? 'true' : 'false'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bodyChange: value === 'true' })
                      }
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="bodyChangeYes" />
                        <Label htmlFor="bodyChangeYes" className="font-normal cursor-pointer">
                          あり
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="bodyChangeNo" />
                        <Label htmlFor="bodyChangeNo" className="font-normal cursor-pointer">
                          なし
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="rootCause">お直しが起きた原因</Label>
                    <Select
                      value={formData.rootCause}
                      onValueChange={(value) =>
                        setFormData({ ...formData, rootCause: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="テンプレートを選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOT_CAUSE_TEMPLATES.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      id="rootCause"
                      value={formData.rootCause}
                      onChange={(e) =>
                        setFormData({ ...formData, rootCause: e.target.value })
                      }
                      placeholder="原因を入力..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: 備考 */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">備考・エピソード</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="その他の情報を入力..."
                      rows={6}
                    />
                  </div>
                </div>
              )}

              {/* Step 6: 確認 */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <div>
                      <span className="text-sm font-medium text-slate-600">店舗:</span>
                      <span className="ml-2">{STORES.find(s => s.code === formData.store)?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">顧客名:</span>
                      <span className="ml-2">{formData.customerName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">来店日:</span>
                      <span className="ml-2">{formData.visitDate || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">サポート区分:</span>
                      <span className="ml-2">
                        {formData.supportType === 'within' ? 'サポート内（無料）' : 'サポート外（有料）'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">アイテム:</span>
                      <span className="ml-2">{formData.selectedItem || '-'}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    上記の内容で登録します。よろしいですか？
                  </p>
                </div>
              )}

              {/* ナビゲーションボタン */}
              <div className="flex justify-between mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  戻る
                </Button>
                {currentStep < totalSteps ? (
                  <Button onClick={handleNext}>
                    次へ
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit}>
                    <Check className="mr-2 h-4 w-4" />
                    登録する
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
