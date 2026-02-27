"use client"

import { Suspense } from "react"
import AdminLeavesContent from "./admin-leaves-content"

export default function AdminLeavesPage() {
  return (
    <Suspense fallback={null}>
      <AdminLeavesContent />
    </Suspense>
  )
}
