'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, CreditCard, Shield, DollarSign, Users, Star } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Guide {
  id: string
  title: string
  description?: string
  pricing: {
    type: 'free' | 'paid' | 'pwyw'
    price?: number
    suggestedPrice?: number
  }
  author: {
    id: string
    username: string
    name?: string
    profileImage?: {
      url: string
    }
  }
  featuredImage?: {
    url: string
  }
  stats?: {
    purchases?: number
    averageRating?: number
    reviewCount?: number
  }
}

interface GuidePaymentModalProps {
  guide: Guide
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Platform fee breakdown component
function FeeBreakdown({ amount }: { amount: number }) {
  const stripeFee = Math.round(amount * 0.029 + 0.30 * 100) / 100
  const platformFee = Math.round(amount * 0.15 * 100) / 100
  const creatorEarnings = amount - stripeFee - platformFee

  return (
    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-sm text-gray-900">Payment Breakdown</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Guide Price</span>
          <span className="font-medium">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Platform Fee (15%)</span>
          <span className="text-gray-600">-${platformFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Processing Fee</span>
          <span className="text-gray-600">-${stripeFee.toFixed(2)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between font-medium">
          <span className="text-green-600">Creator Earnings</span>
          <span className="text-green-600">${creatorEarnings.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// Payment form component
function PaymentForm({ guide, onSuccess, onClose }: {
  guide: Guide
  onSuccess: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useCurrentUser()
  const [processing, setProcessing] = useState(false)
  const [payAmount, setPayAmount] = useState(
    guide.pricing.type === 'paid' ? guide.pricing.price || 0 :
    guide.pricing.type === 'pwyw' ? guide.pricing.suggestedPrice || 5 : 0
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !user) {
      toast.error('Payment system not ready')
      return
    }

    if (payAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setProcessing(true)

    try {
      const cardElement = elements.getElement(CardElement)
      
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: user.email,
          name: user.name || user.username,
        },
      })

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message)
      }

      // Process payment through our API
      const response = await fetch(`/api/guides/${guide.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: payAmount,
          paymentMethodId: paymentMethod.id,
          userId: user.id,
          paymentType: 'stripe'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Guide purchased successfully! 🎉')
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || 'Payment failed')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = () => {
    if (guide.pricing.type === 'free') return 'Free'
    if (guide.pricing.type === 'paid') return `$${guide.pricing.price}`
    return 'Pay what you want'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Guide Summary */}
      <div className="flex items-start space-x-4">
        {guide.featuredImage?.url && (
          <img
            src={guide.featuredImage.url}
            alt={guide.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{guide.title}</h3>
          <p className="text-sm text-gray-600">by {guide.author.name || guide.author.username}</p>
          <div className="flex items-center space-x-4 mt-2">
            <Badge variant="secondary">{formatPrice()}</Badge>
            {guide.stats?.purchases && (
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                {guide.stats.purchases} purchased
              </div>
            )}
            {guide.stats?.averageRating && (
              <div className="flex items-center text-sm text-gray-500">
                <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                {guide.stats.averageRating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Pricing Section */}
      {guide.pricing.type === 'pwyw' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Choose your price
          </label>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <input
              type="number"
              min="1"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter amount"
            />
          </div>
          {guide.pricing.suggestedPrice && (
            <p className="text-sm text-gray-500">
              Suggested: ${guide.pricing.suggestedPrice}
            </p>
          )}
        </div>
      )}

      {/* Payment Method */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="p-4 border border-gray-300 rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Fee Breakdown */}
      {payAmount > 0 && <FeeBreakdown amount={payAmount} />}

      {/* Security Notice */}
      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
        <Shield className="h-5 w-5 text-blue-600" />
        <p className="text-sm text-blue-800">
          Your payment is secured by Stripe. We never store your card details.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={processing || !stripe || payAmount <= 0}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ${payAmount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// Main modal component
export default function GuidePaymentModal({
  guide,
  isOpen,
  onClose,
  onSuccess
}: GuidePaymentModalProps) {
  const { user } = useCurrentUser()

  const handleFreeGuide = async () => {
    if (!user) {
      toast.error('Please log in to get this guide')
      return
    }

    try {
      const response = await fetch(`/api/guides/${guide.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 0,
          userId: user.id,
          paymentType: 'free'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Free guide added to your library! 🎉')
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to get guide')
      }
    } catch (error: any) {
      console.error('Error getting free guide:', error)
      toast.error(error.message || 'Failed to get guide')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guide.pricing.type === 'free' ? 'Get Free Guide' : 'Purchase Guide'}
          </DialogTitle>
          <DialogDescription>
            {guide.pricing.type === 'free' 
              ? 'This guide is free! Click below to add it to your library.'
              : 'Complete your purchase to access this guide immediately.'
            }
          </DialogDescription>
        </DialogHeader>

        {guide.pricing.type === 'free' ? (
          <div className="space-y-4">
            {/* Free Guide Summary */}
            <div className="flex items-start space-x-4">
              {guide.featuredImage?.url && (
                <img
                  src={guide.featuredImage.url}
                  alt={guide.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{guide.title}</h3>
                <p className="text-sm text-gray-600">by {guide.author.name || guide.author.username}</p>
                <Badge variant="secondary" className="mt-2">Free</Badge>
              </div>
            </div>

            <Button onClick={handleFreeGuide} className="w-full">
              Add to Library
            </Button>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <PaymentForm
              guide={guide}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
} 