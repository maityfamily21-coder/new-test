"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [exportingWithQr, setExportingWithQr] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setResults(null)
    } else {
      alert("Please select a valid CSV file")
      e.target.value = ""
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/admin/students/bulk-import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setProgress(100)
      } else {
        alert(data.message || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      alert("Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/students/export", { cache: "no-store" })
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export error:", error)
      alert("Export failed")
    }
  }

  const handleExportWithQr = async () => {
    try {
      setExportingWithQr(true)
      const response = await fetch("/api/admin/students/export-with-qr", { cache: "no-store" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Export failed with status ${response.status}`)
      }
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `students_qr_export_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export with QR error:", error)
      alert("Export with QR failed: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setExportingWithQr(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `full_name,enrollment_number,course_name,email,phone_number,parent_phone_number,admission_semester,current_semester,resume_link,agreement_link,placement_status,company_name,placement_tenure_days,password,interests
John Doe,2021001,Computer Science Engineering,john@example.com,9876543210,9876543211,1,3,https://drive.google.com/resume1,https://drive.google.com/agreement1,Active,,0,password123,"Software Development,Web Development"
Jane Smith,2021002,Information Technology,jane@example.com,9876543212,9876543213,1,3,https://drive.google.com/resume2,https://drive.google.com/agreement2,Placed,TechCorp,90,password456,"Data Science,AI/ML"`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "student_import_template.csv"
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/admin/students">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Students
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Bulk Import Students</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Students
            </Button>
            <Button onClick={handleExportWithQr} disabled={exportingWithQr} variant="default">
              <Download className="w-4 h-4 mr-2" />
              {exportingWithQr ? "Exporting..." : "Export with QR"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Import Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• File must be in CSV format</li>
                    <li>• Include all required columns</li>
                    <li>• Interests should be comma-separated in quotes</li>
                    <li>• Students can have 1-5 interests</li>
                    <li>• Course names must match existing courses</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Required Columns:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• full_name, enrollment_number</li>
                    <li>• course_name, email, phone_number</li>
                    <li>• parent_phone_number, admission_semester</li>
                    <li>• current_semester, password, interests</li>
                  </ul>
                </div>
              </div>
              <Button onClick={downloadTemplate} variant="outline" className="w-full md:w-auto bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>Select a CSV file containing student data to import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV File</Label>
                <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
              </div>

              {file && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing students...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <Button onClick={handleImport} disabled={!file || importing} className="w-full">
                {importing ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-bounce" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Students
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {results.errors.length > 0 ? (
                    <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                    <div className="text-sm text-green-700">Successfully Imported</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-sm text-red-700">Failed to Import</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                    <div className="text-sm text-blue-700">Total Processed</div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                    <div className="bg-red-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      {results.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-700 mb-1">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.successful > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {results.successful} students have been successfully imported and can now log in to the portal.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
