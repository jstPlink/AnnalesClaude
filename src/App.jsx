import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import NoteView from './pages/NoteView'
import Profile from './pages/Profile'
import WebLayout from './pages/web/WebLayout'
import WebLogin from './pages/web/WebLogin'
import WebMonth from './pages/web/WebMonth'
import WebDay from './pages/web/WebDay'
import WebNote from './pages/web/WebNote'
import WebProfile from './pages/web/WebProfile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- App mobile (phone-shaped) --- */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <MonthView />
              </RequireAuth>
            }
          />
          <Route
            path="/profilo"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/day/:date"
            element={
              <RequireAuth>
                <DayView />
              </RequireAuth>
            }
          />
          <Route
            path="/note/new"
            element={
              <RequireAuth>
                <NoteView />
              </RequireAuth>
            }
          />
          <Route
            path="/note/:id"
            element={
              <RequireAuth>
                <NoteView />
              </RequireAuth>
            }
          />

          {/* --- Interfaccia web (desktop) --- */}
          <Route path="/web/login" element={<WebLogin />} />
          <Route
            path="/web"
            element={
              <RequireAuth redirectTo="/web/login">
                <WebLayout />
              </RequireAuth>
            }
          >
            <Route index element={<WebMonth />} />
            <Route path="day/:date" element={<WebDay />} />
            <Route path="note/new" element={<WebNote />} />
            <Route path="note/:id" element={<WebNote />} />
            <Route path="profilo" element={<WebProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
