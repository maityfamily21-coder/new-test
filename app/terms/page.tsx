"use client"

import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, Printer, ShieldCheck, Scale, Lock, Info, AlertTriangle, Copyright } from "lucide-react"
import { motion } from "framer-motion"

export default function TermsPage() {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-[#0a0a0f] dark:via-[#1a1a28] dark:to-[#0f0f1a] text-gray-900 dark:text-white transition-all duration-300 print:bg-white print:text-black">
      
      {/* Background Glows (Hidden on Print) */}
      <div className="absolute inset-0 pointer-events-none dark:block hidden print:hidden">
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-purple-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-cyan-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation Bar (Hidden on Print) */}
      <nav className="sticky top-0 z-30 backdrop-blur-md border-b border-gray-200 dark:border-white/10 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-cyan-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-cyan-500 hover:text-white transition"
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm">Print PDF</span>
            </button>
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            TERMS & <span className="text-cyan-500">CONDITIONS</span>
          </h1>
          <div className="flex flex-col gap-1 text-gray-600 dark:text-gray-400">
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">SAMANVAY – ERP Portal (Avinya Project)</p>
            <p className="text-sm italic">Last Updated: December 20, 2025</p>
          </div>
        </motion.div>

        {/* Full Terms Content */}
        <div className="space-y-10 text-gray-700 dark:text-gray-300 leading-relaxed">
          
          {/* Section 1 & 2 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-4">
                <Info className="w-5 h-5 text-cyan-500" /> 1. Introduction
              </h2>
              <p className="text-sm">1.1. These Terms govern access to the SAMANVAY ERP portal, part of the <strong>Avinya Project</strong>, developed and owned by <strong>Simon Maity</strong> for GUCPC.</p>
              <p className="text-sm mt-2">1.2. By using SAMANVAY, you accept these Terms in full.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-4">
                <ShieldCheck className="w-5 h-5 text-cyan-500" /> 2. Definitions
              </h2>
              <ul className="text-sm space-y-2">
                <li><strong>“User”</strong>: Students, faculty, and admins.</li>
                <li><strong>“Confidential Info”</strong>: Non-public records and data.</li>
                <li><strong>“Personal Data”</strong>: Identifiable personal information.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Ownership - Highlighted */}
          <section className="p-8 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Copyright className="w-6 h-6 text-cyan-500" /> 3. Ownership & Intellectual Property
            </h2>
            <div className="space-y-3">
              <p>3.1. SAMANVAY, its source code, designs, workflows, and database schemas are the <strong>exclusive intellectual property of Simon Maity</strong> and/or authorised institutional owners.</p>
              <p>3.2. Use of the name “SAMANVAY” or GUCPC branding requires prior written permission.</p>
              <p>3.3. No ownership is transferred to Users. Reverse engineering or unauthorized distribution is strictly prohibited.</p>
            </div>
          </section>

          {/* Section 4, 5, 6 */}
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">4. Scope & Purpose</h3>
                <p className="text-sm">Facilitates academic functions like attendance, examinations, and fee management for institutional use only.</p>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">5. User Eligibility</h3>
                <p className="text-sm">Access is limited to authorized personnel with issued credentials. Account sharing is strictly prohibited.</p>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">6. Prohibited Conduct</h3>
                <p className="text-sm">No tampering with records, scraping data, or uploading malicious code. Violation leads to disciplinary action.</p>
              </div>
            </div>
          </section>

          {/* Section 7 & 8: Data */}
          <section className="p-8 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-4">
              <Lock className="w-5 h-5 text-cyan-500" /> 7 & 8. Data Handling & Acceptable Use
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <p>7.1 - 7.4. Data is processed per Indian laws. While we use encryption and role-based access, absolute security cannot be guaranteed. Third-party processors (Cloud/Payment) are engaged under contract.</p>
              <p>8.1 - 8.2. Institutional records must be used for legitimate academic purposes only. Data exports require verification and authorization.</p>
            </div>
          </section>

          {/* Section 9, 10, 11 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-white">9 & 10. Availability & Maintenance</h3>
              <p className="text-sm">The portal is under continuous development. We provide the service on an “as-available” basis. Maintenance may cause temporary downtime.</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-white">11. User Content Rights</h3>
              <p className="text-sm">Users retain ownership of original uploads but grant the institution a license to store and process content for administrative purposes.</p>
            </div>
          </section>

          {/* Section 12 & 13: Liability */}
          <section className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
            <h2 className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-5 h-5" /> 12 & 13. Disclaimers & Indemnity
            </h2>
            <div className="text-sm space-y-4">
              <p><strong>12.1. Warranties:</strong> Provided “AS IS”. No warranty for error-free operation.</p>
              <p><strong>12.2. Limitation:</strong> Simon Maity and GUCPC are not liable for indirect or consequential losses or data loss.</p>
              <p><strong>13.1. Indemnity:</strong> Users agree to hold the owner and institution harmless from claims arising from user breach or misuse.</p>
            </div>
          </section>

          {/* Section 14 to 20: Legal Standard */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-sm border-t border-gray-200 dark:border-white/10 pt-10">
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white">14. Incident Reporting</h4>
              <p>Report security breaches immediately to the Portal Admin.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white">15. Third-Party Integrations</h4>
              <p>Data shared with gateways (Payment/Email) is subject to their privacy policies.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white">17. Termination</h4>
              <p>The institution may suspend access for security protection or breach of terms.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white">19. Governing Law</h4>
              <p>Governed by the laws of India. Jurisdiction: Ahmedabad, Gujarat.</p>
            </div>
          </section>

          {/* Section 21: Contact */}
          <section className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">21. Notices & Contact</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">For administrative or legal inquiries, contact:</p>
            <div className="inline-block text-left text-sm space-y-1">
              <p><strong>Portal Admin:</strong> Simon Maity / GUCPC Admin</p>
              <p><strong>Email:</strong> admin@samanvay.gujaratuniversity.ac.in</p>
              <p><strong>Address:</strong> GUCPC, Gujarat University, Ahmedabad, 380009.</p>
            </div>
          </section>

          {/* Acknowledgement */}
          <div className="text-center text-xs text-gray-500 pt-10">
            <p>22.1. By using SAMANVAY, Users acknowledge that they have read and agreed to these Terms.</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-10 border-t border-gray-300 dark:border-gray-700/40 print:hidden">
        <p className="text-xs text-gray-500">
          © 2025 Gujarat University GUCPC "Samanvay". All Rights Reserved.
        </p>
      </footer>
    </div>
  )
}
