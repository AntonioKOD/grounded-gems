'use client';

import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Shield, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayPalContestPaymentProps {
  locationData: {
    name: string;
    description: string;
    address: {
      city: string;
      state: string;
      country: string;
    };
    featuredImage?: string;
    categories: string[];
    tags?: string[];
  };
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const CONTEST_ENTRY_PRICE = 20.00; // $20 contest entry fee

// PayPal Button Component
function PayPalButton({ locationData, onSuccess, onError, onCancel }: PayPalContestPaymentProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = async (data: any, actions: any) => {
    try {
      setIsProcessing(true);
      
      // Create the order on our backend
      const response = await fetch('/api/contest/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationData,
          amount: CONTEST_ENTRY_PRICE,
        }),
      });

      const orderData = await response.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create PayPal order');
      }

      return orderData.orderId;
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      onError(error instanceof Error ? error.message : 'Failed to create order');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      setIsProcessing(true);
      
      // Capture the payment on our backend
      const response = await fetch('/api/contest/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderID: data.orderID,
          locationData,
        }),
      });

      const captureData = await response.json();

      if (!captureData.success) {
        throw new Error(captureData.error || 'Failed to capture payment');
      }

      toast({
        title: "Payment Successful! 🎉",
        description: "Your location has been entered into the contest.",
      });

      onSuccess(captureData);
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      onError(error instanceof Error ? error.message : 'Payment capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const onPayPalError = (err: any) => {
    console.error('PayPal error:', err);
    onError('Payment failed. Please try again.');
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onPayPalError}
        onCancel={onCancel}
        disabled={isProcessing}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 45,
        }}
      />
      
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm text-blue-700">Processing payment...</span>
        </div>
      )}
    </div>
  );
}

export function PayPalContestPayment({ locationData, onSuccess, onError, onCancel }: PayPalContestPaymentProps) {
  const paypalClientId = 'ATJ9T3M-nmctumSZAIXVqs1TJfwCky7-2YZiPOB__rYJwJw7dpk3PGkEv_S1XB8jZAGGDzT1i7QRn480'; // Hardcoded for sandbox

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Trophy className="h-8 w-8 text-yellow-500 mr-2" />
          <CardTitle className="text-xl">Contest Entry Payment</CardTitle>
        </div>
        <CardDescription>
          Enter your location in the Sacavia Hidden Gems Contest
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Location Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">{locationData.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{locationData.description}</p>
          <p className="text-sm text-gray-500">
            📍 {locationData.address.city}, {locationData.address.state}
          </p>
        </div>

        {/* Price Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">${CONTEST_ENTRY_PRICE.toFixed(2)}</div>
          <p className="text-sm text-gray-500">Contest Entry Fee</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Shield className="h-4 w-4" />
          <span>Secure payment powered by PayPal</span>
        </div>

        {/* PayPal Payment */}
        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            currency: 'USD',
            intent: 'capture',
          }}
        >
          <PayPalButton
            locationData={locationData}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
          />
        </PayPalScriptProvider>

        {/* Alternative Payment Method */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              // Redirect to Stripe checkout as alternative
              window.location.href = '/api/contest/checkout';
            }}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pay with Card (Stripe)
          </Button>
        </div>

        {/* Terms */}
        <div className="text-xs text-gray-500 text-center">
          By proceeding, you agree to our{' '}
          <a href="/terms" className="underline hover:text-gray-700">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
