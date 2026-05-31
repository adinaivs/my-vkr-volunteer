// app/api/finik/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFinikPayment, CreatePaymentData } from '@/lib/finik';

const FIXED_AMOUNT = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workId, workTopic, userId } = body;

    if (!workId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: workId and userId' },
        { status: 400 }
      );
    }

    const paymentData: CreatePaymentData = {
      amount: FIXED_AMOUNT,
      workId,
      workTopic: workTopic || 'Волонтёрский проект',
      userId,
    };

    const paymentUrl = await createFinikPayment(paymentData);

    return NextResponse.json({
      success: true,
      paymentUrl,
      amount: FIXED_AMOUNT,
    });

  } catch (error) {
    console.error('Error creating Finik payment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
