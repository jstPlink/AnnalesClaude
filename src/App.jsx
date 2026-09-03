import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import NoteView from './pages/NoteView'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
