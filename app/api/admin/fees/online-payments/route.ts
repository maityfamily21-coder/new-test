import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const db = await getDb();

    let query = `
      SELECT 
        ofp.*,
        s.full_name,
        s.enrollment_number,
        c.name as course_name
      FROM online_fee_payments ofp
      LEFT JOIN students s ON ofp.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (semester) {
      query += ' AND ofp.semester = ?';
      params.push(parseInt(semester));
    }

    if (status) {
      query += ' AND ofp.status = ?';
      params.push(status);
    }

    if (studentId) {
      query += ' AND ofp.student_id = ?';
      params.push(studentId);
    }

    // Get total count
    const [countResult] = await db.execute(`SELECT COUNT(*) as count FROM (${query}) as t`, params);
    const total = countResult?.count || 0;

    // Get paginated results
    query += ' ORDER BY ofp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [payments] = await db.execute(query, params);

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching online payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
