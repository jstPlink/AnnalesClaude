import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/web/Sidebar'

export default function WebLayout() {
  const today = new Date()
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })

  return (
    <div className="flex min-h-dvh w-full bg-cream text-ink">
      <Sidebar cursor={cursor} setCursor={setCursor} />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-8 py-8 xl:px-12">
          <Outlet context={{ cursor, setCursor }} />
        </div>
      </main>
    </div>
  )
}
