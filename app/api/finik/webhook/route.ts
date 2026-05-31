// app/api/finik/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyFinikWebhook,
  isTimestampValid,
  FinikWebhookData
} from '@/lib/finik';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('signature');
    const timestamp = request.headers.get('x-api-timestamp');
    const host = request.headers.get('host');

    if (!signature || !timestamp) {
      console.error('Missing signature or timestamp in webhook');
      return NextResponse.json(
        { error: 'Missing signature or timestamp' },
        { status: 400 }
      );
    }

    if (!isTimestampValid(timestamp)) {
      console.error('Webhook timestamp is too old or invalid');
      return NextResponse.json(
        { error: 'Invalid timestamp' },
        { status: 400 }
      );
    }

    const body: FinikWebhookData = await request.json();

    const headers: Record<string, string> = {
      'host': host || '',
    };

    const webhookPath = '/api/finik/webhook';
    const isValid = await verifyFinikWebhook(
      signature,
      timestamp,
      body as any,
      headers,
      webhookPath
    );

    if (!isValid) {
      console.error('Invalid webhook signature');

      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    let metadata: {
      userId?: string;
      workId?: string;
      paymentId?: string
    } = {};

    try {
      if (body.data && body.data.metadata) {
        if (typeof body.data.metadata === 'string') {
          metadata = JSON.parse(body.data.metadata);
        } else {
          metadata = body.data.metadata as typeof metadata;
        }
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }

    if (body.status === 'SUCCEEDED' || body.status === 'succeeded') {
      const { userId, workId } = metadata;

      if (!userId || !workId) {
        console.error('Missing userId or workId in metadata');
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }

      console.log(`[PAYMENT_SUCCESS] Work ID: ${workId} | Amount: ${body.amount} | Transaction: ${body.transactionId}`);

      const payment = await prisma.payment.create({
        data: {
          userId,
          projectId: workId,
          finikPaymentId: body.transactionId || body.id || 'unknown',
          amount: 5,
          status: 'succeeded',
          paymentMethod: 'FINIK_QR',
          callbackData: body as any,
          paidAt: new Date(),
        },
      });

      await prisma.project.update({
        where: { id: workId },
        data: {
          isPaid: true,
          status: 'moderation',
          publishedAt: new Date(),
          paymentId: payment.id,
        },
      });

      console.log(`[PAYMENT_SUCCESS] Payment ${payment.id} created, project ${workId} moved to moderation`);

    } else if (body.status === 'FAILED' || body.status === 'failed') {
      const { userId, workId } = metadata;
      console.error('[PAYMENT_FAILED]', { userId, workId, transactionId: body.transactionId });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing Finik webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
