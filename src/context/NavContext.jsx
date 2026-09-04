import { createContext, useContext, useState } from 'react'

// Mese/anno correntemente visualizzato, condiviso tra la vista mensile e la
// barra laterale del layout desktop.
const NavContext = createContext(null)

export function NavProvider({ children }) {
  const today = new Date()
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  return (
    <NavContext.Provider value={{ cursor, setCursor }}>
      {children}
    </NavContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav deve essere usato dentro <NavProvider>')
  return ctx
}
