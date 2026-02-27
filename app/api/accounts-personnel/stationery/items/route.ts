import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { jwtVerify } from "jose"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function verifyToken(token: string) {
  try {
    const tokenWithoutBearer = token.startsWith("Bearer ") ? token.slice(7) : token
    const verified = await jwtVerify(tokenWithoutBearer, SECRET_KEY)
    return verified.payload as any
  } catch (error) {
    return null
  }
}

// GET: Retrieve available stationery items for accounts personnel
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(authHeader)
    if (!payload || payload.role !== "accounts_personnel") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const items = await sql`
      SELECT 
        id, 
        name, 
        description, 
        available_quantity, 
        unit
      FROM stationery_inventory
      WHERE available_quantity > 0
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        available_quantity: item.available_quantity,
        unit: item.unit,
      })),
    })
  } catch (error) {
    console.error("Error fetching stationery items for accounts personnel:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch items" }, { status: 500 })
  }
}
