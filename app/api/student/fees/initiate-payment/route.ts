import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { encryptCCAvenue, generateReferenceId } from '@/lib/ccavenue-util';

const CCAVENUE_MERCHANT_ID = process.env.CCAVENUE_MERCHANT_ID || '';
const CCAVENUE_ACCESS_CODE = process.env.CCAVENUE_ACCESS_CODE || '';
const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || '';
const REDIRECT_URL = process.env.CCAVENUE_REDIRECT_URL || 'http://localhost:3000/api/student/fees/payment-callback';
const CANCEL_URL = process.env.CCAVENUE_CANCEL_URL || 'http://localhost:3000/student/fees';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { semester, feeType, amount, studentId, enrollmentNumber, fullName, courseName } = await request.json();

    // Validate inputs
    if (!semester || !feeType || !amount || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Generate reference ID
    const referenceId = generateReferenceId(studentId, semester, feeType);

    // Prepare CCAvenue request parameters
    const params = {
      merchant_id: CCAVENUE_MERCHANT_ID,
      order_id: referenceId,
      currency: 'INR',
      amount: amount.toFixed(2),
      redirect_url: REDIRECT_URL,
      cancel_url: CANCEL_URL,
      language: 'EN',
      billing_name: fullName,
      billing_email: '', // Student email if available
      billing_tel: '', // Student phone if available
      billing_city: 'Ahmedabad',
      billing_state: 'GJ',
      billing_country: 'India',
      billing_zip: '380001',
      merchant_param1: studentId,
      merchant_param2: enrollmentNumber,
      merchant_param3: semester.toString(),
      merchant_param4: feeType,
      merchant_param5: courseName,
    };

    // Convert to query string
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value || '')}`)
      .join('&');

    // Encrypt the request
    const encryptedRequest = encryptCCAvenue(queryString, CCAVENUE_WORKING_KEY);

    // Store pending transaction
    const db = await getDb();
    await db.execute(`
      INSERT INTO online_fee_payments (
        student_id, semester, fee_type, amount, status, 
        reference_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [studentId, semester, feeType, amount, 'PENDING', referenceId]);

    return NextResponse.json({
      success: true,
      encRequest: encryptedRequest,
      accessCode: CCAVENUE_ACCESS_CODE,
      redirectUrl: 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction',
      referenceId,
    });
  } catch (error) {
    console.error('[v0] Error initiating payment:', error);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}
