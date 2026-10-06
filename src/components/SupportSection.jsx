import SettingsSection from './SettingsSection'

// Contatti di supporto: non sono scritti nel codice, vengono dalla build
// (`VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_TELEGRAM` in .env). Senza nessuno dei
// due la sezione non compare.
const EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || ''
const TELEGRAM = import.meta.env.VITE_SUPPORT_TELEGRAM?.trim().replace(/^@/, '') || ''

export default function SupportSection() {
  if (!EMAIL && !TELEGRAM) return null
  const link =
    'font-medium text-ink underline decoration-line-soft underline-offset-2 hover:decoration-ink'
  return (
    <SettingsSection title="Supporto" icon="mail">
      <dl className="mt-5 divide-y divide-line-soft border-y border-line-soft text-sm">
        {EMAIL && (
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Email</dt>
            <dd>
              <a href={`mailto:${EMAIL}`} className={link}>
                {EMAIL}
              </a>
            </dd>
          </div>
        )}
        {TELEGRAM && (
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Telegram</dt>
            <dd>
              <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noreferrer" className={link}>
                @{TELEGRAM}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </SettingsSection>
  )
}
