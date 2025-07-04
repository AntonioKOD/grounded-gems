'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TestTube, Loader2, Zap, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface TestEarningsButtonProps {
  userId: string
  onTestDataCreated?: () => void
}

export default function TestEarningsButton({ userId, onTestDataCreated }: TestEarningsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [testAmount, setTestAmount] = useState('29.99')
  const [testGuideTitle, setTestGuideTitle] = useState('Premium City Guide')

  const generateTestData = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/test/creator-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          testAmount: parseFloat(testAmount),
          testGuideTitle
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Test purchase created! You earned $${data.testPurchase.creatorEarnings.toFixed(2)}`)
        if (onTestDataCreated) {
          onTestDataCreated()
        }
      } else {
        toast.error(data.error || 'Failed to create test data')
      }
    } catch (error) {
      console.error('Error generating test data:', error)
      toast.error('Failed to create test data')
    } finally {
      setIsGenerating(false)
    }
  }

  const predefinedAmounts = [
    { label: 'Small Guide', amount: '9.99' },
    { label: 'Medium Guide', amount: '19.99' },
    { label: 'Premium Guide', amount: '29.99' },
    { label: 'Comprehensive Guide', amount: '49.99' },
    { label: 'Ultimate Experience', amount: '99.99' }
  ]

  return (
    <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg text-amber-900">Development Mode</CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Testing
          </Badge>
        </div>
        <CardDescription className="text-amber-700">
          Generate test earnings data to preview your dashboard
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-100 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Development Only</p>
            <p>This creates fake purchase data for testing. Remove before production.</p>
          </div>
        </div>

        {!showAdvanced ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {predefinedAmounts.slice(0, 4).map((preset) => (
                <Button
                  key={preset.amount}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestAmount(preset.amount)
                    setTestGuideTitle(preset.label)
                    generateTestData()
                  }}
                  disabled={isGenerating}
                  className="text-left"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">${preset.amount}</span>
                    <span className="text-xs text-gray-500">{preset.label}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAdvanced(true)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                Custom Amount
              </Button>
              <Button
                onClick={generateTestData}
                disabled={isGenerating}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Test
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="testAmount" className="text-sm font-medium">
                Test Amount ($)
              </Label>
              <Input
                id="testAmount"
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="29.99"
                min="1"
                max="999"
                step="0.01"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="testGuideTitle" className="text-sm font-medium">
                Test Guide Title
              </Label>
              <Input
                id="testGuideTitle"
                value={testGuideTitle}
                onChange={(e) => setTestGuideTitle(e.target.value)}
                placeholder="Premium City Guide"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAdvanced(false)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                Back to Quick
              </Button>
              <Button
                onClick={generateTestData}
                disabled={isGenerating || !testAmount || parseFloat(testAmount) <= 0}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Generate Test Data
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 