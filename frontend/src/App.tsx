import { Navigate, Route, Routes } from "react-router-dom"

import { Layout } from "@/components/layout"
import { DriversPage } from "@/pages/drivers-page"
import { InvoicesPage } from "@/pages/invoices-page"
import { JobDetailPage } from "@/pages/job-detail-page"
import { JobsPage } from "@/pages/jobs-page"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="*" element={<Navigate to="/jobs" replace />} />
      </Route>
    </Routes>
  )
}
