import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import SplashScreen from './components/SplashScreen'
import LoginPage from './pages/LoginPage'
import ComposePage from './pages/ComposePage'
import DraftsPage from './pages/DraftsPage'
import ScheduledPage from './pages/ScheduledPage'
import CalendarPage from './pages/CalendarPage'
import ApiConfigPage from './pages/ApiConfigPage'
import BulkUploadPage from './pages/BulkUploadPage'
import EmailPage from './pages/EmailPage'
import AppToaster from './components/AppToaster'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/compose" replace />} />
          <Route path="compose" element={<ComposePage />} />
          <Route path="bulk" element={<BulkUploadPage />} />
          <Route path="email" element={<EmailPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="scheduled" element={<ScheduledPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="api-config" element={<ApiConfigPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/compose" replace />} />
    </Routes>
  )
}

export default function App() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2400)
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <AppToaster />
          <SplashScreen visible={splash} />
          <div
            className={`h-dvh max-h-dvh overflow-hidden ${splash ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}
          >
            <AppRoutes />
          </div>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
