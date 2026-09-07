import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { parseWall, dayMonthLabel } from '../lib/dates'
import { plainText } from '../lib/notes'
import Icon from './Icon'

const pad = (n) => String(n).padStart(2, '0')

// "In questo giorno": note scritte nella stessa data (mese-giorno) degli anni
// precedenti. Non renderizza nulla se non ce ne sono.
export default function OnThisDay({ className = '' }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState(null)

  useEffect(() => {
    const now = new Date()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const thisYear = now.getFullYear()
    let alive = true
    pb.collection('note')
      .getFullList({
        // Il campo `date` è "YYYY-MM-DD 00:00:00.000Z": lo spazio finale evita
        // falsi positivi con la parte oraria.
        filter: pb.filter('date ~ {:md}', { md: `-${mm}-${dd} ` }),
        fields: 'id,title,content,date',
        sort: '-date',
      })
      .then((list) => {
        if (!alive) return
        const byYear = new Map()
        for (const n of list) {
          const p = parseWall(n.date)
          if (!p || p.y >= thisYear) continue
          if (!byYear.has(p.y)) {
            byYear.set(p.y, {
              year: p.y,
              key: `${p.y}-${mm}-${dd}`,
              label: dayMonthLabel(`${p.y}-${mm}-${dd}`),
              notes: [],
            })
          }
          byYear.get(p.y).notes.push(n)
        }
        setGroups([...byYear.values()])
      })
      .catch(() => alive && setGroups([]))
    return () => {
      alive = false
    }
  }, [])

  if (!groups || groups.length === 0) return null

  return (
    <div
      className={'rounded-2xl border border-line bg-cream p-3 ' + className}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <Icon name="calendar" size={13} className="shrink-0" />
        In questo giorno
      </p>
      <div className="space-y-1">
        {groups.map((g) => {
          const n = g.notes[0]
          const preview =
            n.title?.trim() ||
            plainText(n.content).slice(0, 70) ||
            `${g.notes.length} not${g.notes.length === 1 ? 'a' : 'e'}`
          return (
            <button
              key={g.year}
              type="button"
              onClick={() => navigate(`/day/${g.key}`)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-tag active:bg-tag"
            >
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                {g.year}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                {preview}
                {g.notes.length > 1 && (
                  <span className="ml-1 text-xs">
                    +{g.notes.length - 1}
                  </span>
                )}
              </span>
              <Icon
                name="chevron-right"
                size={14}
                className="shrink-0 text-ink-soft"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
