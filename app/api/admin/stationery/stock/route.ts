import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifySuperAdminAuth } from "@/lib/course-admin-auth"

const sql = neon(process.env.DATABASE_URL!)

// POST: Add stock to an existing item
export async function POST(request: NextRequest) {
  try {
    console.log("[MYT] Admin stock API - Starting POST request")

    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authenticated || !authResult.admin) {
      console.log("[MYT] Admin stock API - Authentication failed")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("[MYT] Admin stock API - Auth successful, admin:", authResult.admin)

    const body = await request.json()
    const { itemId, quantityToAdd } = body

    console.log("[MYT] Admin stock API - Request body:", { itemId, quantityToAdd })

    if (!itemId || !quantityToAdd || quantityToAdd <= 0) {
      return NextResponse.json({ success: false, error: "Invalid item ID or quantity" }, { status: 400 })
    }

    // Get current item details
    const itemResult = await sql`
      SELECT id, name, total_quantity, available_quantity, unit
      FROM stationery_inventory
      WHERE id = ${itemId}
    `

    if (itemResult.length === 0) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    const item = itemResult[0]
    const newTotalQuantity = item.total_quantity + quantityToAdd
    const newAvailableQuantity = item.available_quantity + quantityToAdd

    console.log("[MYT] Admin stock API - Updating quantities:", {
      oldTotal: item.total_quantity,
      newTotal: newTotalQuantity,
      oldAvailable: item.available_quantity,
      newAvailable: newAvailableQuantity,
    })

    // Update inventory quantities
    await sql`
      UPDATE stationery_inventory
      SET 
        total_quantity = ${newTotalQuantity},
        available_quantity = ${newAvailableQuantity},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${itemId}
    `

    console.log("[MYT] Admin stock API - Inventory updated successfully")

    const addedByName = authResult.admin.name || authResult.admin.username || "Super Admin"
    const addedByUsername = authResult.admin.username || "admin"

    console.log("[MYT] Admin stock API - Inserting history record:", {
      itemId,
      itemName: item.name,
      quantityToAdd,
      addedById: authResult.admin.id,
      addedByType: "super_admin",
      addedByName,
      addedByUsername,
    })

    await sql`
      INSERT INTO stationery_stock_history (
        item_id,
        item_name,
        quantity_added,
        added_by_id,
        added_by_type,
        added_by_name,
        added_by_username
      )
      VALUES (
        ${itemId},
        ${item.name},
        ${quantityToAdd},
        ${authResult.admin.id},
        'super_admin',
        ${addedByName},
        ${addedByUsername}
      )
    `

    console.log("[MYT] Admin stock API - History record inserted successfully")

    return NextResponse.json({
      success: true,
      message: "Stock added successfully",
      item: {
        id: item.id,
        name: item.name,
        previousTotal: item.total_quantity,
        newTotal: newTotalQuantity,
        quantityAdded: quantityToAdd,
      },
    })
  } catch (error) {
    console.error("[MYT] Admin stock API - Error adding stock:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add stock",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// GET: Fetch stock history
export async function GET(request: NextRequest) {
  try {
    console.log("[MYT] Admin stock API - Starting GET request")

    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authenticated) {
      console.log("[MYT] Admin stock API - GET authentication failed")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("itemId")

    console.log("[MYT] Admin stock API - Fetching history, itemId:", itemId)

    let query
    if (itemId) {
      query = sql`
        SELECT 
          sh.id,
          sh.item_id,
          sh.item_name,
          sh.quantity_added,
          sh.added_by_id,
          sh.added_by_type,
          sh.added_by_name,
          sh.added_by_username,
          sh.created_at
        FROM stationery_stock_history sh
        WHERE sh.item_id = ${itemId}
        ORDER BY sh.created_at DESC
        LIMIT 100
      `
    } else {
      query = sql`
        SELECT 
          sh.id,
          sh.item_id,
          sh.item_name,
          sh.quantity_added,
          sh.added_by_id,
          sh.added_by_type,
          sh.added_by_name,
          sh.added_by_username,
          sh.created_at
        FROM stationery_stock_history sh
        ORDER BY sh.created_at DESC
        LIMIT 200
      `
    }

    const history = await query

    console.log("[MYT] Admin stock API - History fetched, count:", history.length)

    return NextResponse.json({
      success: true,
      history,
    })
  } catch (error) {
    console.error("[MYT] Admin stock API - Error fetching stock history:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock history",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
