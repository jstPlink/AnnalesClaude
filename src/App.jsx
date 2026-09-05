import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NavProvider } from './context/NavContext'
import { useIsWide } from './hooks/useIsWide'
import RequireAuth from './components/RequireAuth'
import Sidebar from './components/web/Sidebar'
import Login from './pages/Login'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import NoteView from './pages/NoteView'
import Profile from './pages/Profile'
import DataView from './pages/DataView'
import FilterView from './pages/FilterView'
import WebLogin from './pages/web/WebLogin'
import WebMonth from './pages/web/WebMonth'
import WebDay from './pages/web/WebDay'
import WebNote from './pages/web/WebNote'
import WebProfile from './pages/web/WebProfile'
import WebData from './pages/web/WebData'
import WebFilter from './pages/web/WebFilter'

// Shell desktop: barra laterale fissa + area contenuti scrollabile.
function DesktopShell({ children }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-cream text-ink">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-8 py-8 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  )
}

// Sceglie la variante mobile o desktop in base alla larghezza della finestra.
function Screen({ mobile: Mobile, desktop: Desktop, chrome = true }) {
  const wide = useIsWide()
  if (!wide) return <Mobile />
  return chrome ? (
    <DesktopShell>
      <Desktop />
    </DesktopShell>
  ) : (
    <Desktop />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <Screen mobile={Login} desktop={WebLogin} chrome={false} />
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Screen mobile={MonthView} desktop={WebMonth} />
                </RequireAuth>
              }
            />
            <Route
              path="/profilo"
              element={
                <RequireAuth>
                  <Screen mobile={Profile} desktop={WebProfile} />
                </RequireAuth>
              }
            />
            <Route
              path="/dati"
              element={
                <RequireAuth>
                  <Screen mobile={DataView} desktop={WebData} />
                </RequireAuth>
              }
            />
            <Route
              path="/filtri"
              element={
                <RequireAuth>
                  <Screen mobile={FilterView} desktop={WebFilter} />
                </RequireAuth>
              }
            />
            <Route
              path="/day/:date"
              element={
                <RequireAuth>
                  <Screen mobile={DayView} desktop={WebDay} />
                </RequireAuth>
              }
            />
            <Route
              path="/note/new"
              element={
                <RequireAuth>
                  <Screen mobile={NoteView} desktop={WebNote} />
                </RequireAuth>
              }
            />
            <Route
              path="/note/:id"
              element={
                <RequireAuth>
                  <Screen mobile={NoteView} desktop={WebNote} />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NavProvider>
    </AuthProvider>
  )
}
