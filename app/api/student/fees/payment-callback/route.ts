import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { decryptCCAvenue } from '@/lib/ccavenue-util';

const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const encResp = formData.get('encResp') as string;

    if (!encResp) {
      return NextResponse.redirect(new URL('/student/fees?error=invalid_response', request.url));
    }

    // Decrypt response
    const decryptedResponse = decryptCCAvenue(encResp, CCAVENUE_WORKING_KEY);
    
    // Parse response parameters
    const params = new URLSearchParams(decryptedResponse);
    const orderId = params.get('order_id') || '';
    const trackingId = params.get('tracking_id') || '';
    const bankRefNo = params.get('bank_ref_no') || '';
    const orderStatus = params.get('order_status') || 'FAILED';
    const amount = parseFloat(params.get('amount') || '0');
    const auth_desc = params.get('auth_desc') || '';

    const studentId = params.get('merchant_param1') || '';
    const semester = parseInt(params.get('merchant_param3') || '0');
    const feeType = params.get('merchant_param4') || '';

    console.log('[v0] Payment callback received:', { orderId, orderStatus, trackingId });

    const db = await getDb();

    // Map CCAvenue status to our status
    let paymentStatus = 'FAILED';
    if (orderStatus === 'Success') {
      paymentStatus = 'SUCCESS';
    } else if (orderStatus === 'Pending') {
      paymentStatus = 'PENDING';
    }

    // Update transaction
    await db.execute(`
      UPDATE online_fee_payments 
      SET status = ?, transaction_id = ?, bank_ref_no = ?, 
          updated_at = NOW()
      WHERE reference_id = ?
    `, [paymentStatus, trackingId, bankRefNo, orderId]);

    // If successful, update student payment records
    if (paymentStatus === 'SUCCESS') {
      // Get current payment record
      const [paymentRecord] = await db.execute(`
        SELECT id FROM online_fee_payments 
        WHERE reference_id = ?
      `, [orderId]);

      if (paymentRecord) {
        // Update fee_payments table (create/update payment record)
        await db.execute(`
          INSERT INTO fee_payments (
            student_id, semester, fee_type, amount, 
            payment_date, transaction_id, payment_source,
            status, created_at
          ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
          amount = amount + VALUES(amount),
          payment_date = NOW(),
          status = 'Paid',
          updated_at = NOW()
        `, [studentId, semester, feeType, amount, trackingId, 'Online Payment', 'Paid']);
      }
    }

    // Redirect back to fees page with status
    const redirectUrl = new URL('/student/fees', request.url);
    redirectUrl.searchParams.set('payment_status', paymentStatus);
    redirectUrl.searchParams.set('transaction_id', trackingId);
    redirectUrl.searchParams.set('order_id', orderId);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[v0] Error processing payment callback:', error);
    return NextResponse.redirect(new URL('/student/fees?error=callback_error', request.url));
  }
}

// GET handler for payment verification
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const db = await getDb();
    const [payment] = await db.execute(`
      SELECT * FROM online_fee_payments 
      WHERE reference_id = ?
    `, [orderId]);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId: payment.reference_id,
        status: payment.status,
        amount: payment.amount,
        transactionId: payment.transaction_id,
        bankRefNo: payment.bank_ref_no,
        createdAt: payment.created_at,
      },
    });
  } catch (error) {
    console.error('[v0] Error verifying payment:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
