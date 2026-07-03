import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Pill from '../components/ui/Pill'
import { PinIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLocation, geocodePlace } from '../context/LocationContext'
import { uploadProfileImage, deactivateAccount } from '../lib/account'
import { pointFromLocation } from '../lib/products'
import { isValidNgPhone } from '../lib/validation'
import { cn } from '../lib/cn'

const SELLER_ROLES = ['seller', 'both', 'admin']

export default function EditProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const isSeller = SELLER_ROLES.includes(profile?.role)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const save = async (patch) => {
    const { error } = await updateProfile(patch)
    if (error) {
      toast.error(error.message)
      return false
    }
    return true
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)] pb-16">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <h1 className="font-bold font-display">Edit Profile</h1>
      </header>

      <div className="space-y-6 px-4 py-5">
        {/* Banner (sellers) */}
        {isSeller && (
          <ImageField
            label="Banner"
            value={profile?.banner_url}
            kind="banner"
            userId={user?.id}
            onChange={(url) => save({ banner_url: url })}
            preview={(src) => (
              <div className="h-24 w-full overflow-hidden rounded-xl">
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-[#FF6E40] to-[#FF5722]" />}
              </div>
            )}
          />
        )}

        {/* Avatar */}
        <ImageField
          label="Profile photo"
          value={profile?.avatar_url}
          kind="avatar"
          userId={user?.id}
          onChange={(url) => save({ avatar_url: url })}
          preview={(src) => <Avatar src={src} name={profile?.business_name || profile?.full_name} size="xl" />}
        />

        <SavableInput label="Full name" initial={profile?.full_name || ''} onSave={(v) => save({ full_name: v })} />

        {isSeller && (
          <>
            <SavableInput label="Store name" initial={profile?.business_name || ''} onSave={(v) => save({ business_name: v })} />
            <SavableBio initial={profile?.bio || ''} onSave={(v) => save({ bio: v })} />
            <SavableInput
              label="WhatsApp number"
              prefix="+234"
              initial={profile?.whatsapp || ''}
              validate={(v) => (isValidNgPhone(v) ? null : 'Enter a valid Nigerian number')}
              onSave={(v) => save({ whatsapp: v })}
            />
          </>
        )}

        <LocationField profile={profile} onSave={save} />

        {/* Read-only login */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Login email</label>
          <div className="rounded-xl border border-[var(--color-border)] bg-navy/5 px-3 py-2.5 text-sm text-[var(--color-text-muted)] dark:bg-white/5">
            {user?.email || '—'}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Contact support to change your login details.</p>
        </div>

        {/* Danger zone */}
        <div className="border-t border-[var(--color-border)] pt-5">
          <button onClick={() => setDeleteOpen(true)} className="text-sm font-semibold text-error tactile-press">
            Delete Account
          </button>
        </div>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  )
}

/** A text field that saves on blur (if changed) and flashes a checkmark. */
function SavableInput({ label, initial, prefix, validate, onSave }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const commit = async () => {
    if (value === initial) return
    const err = validate?.(value)
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    const ok = await onSave(value.trim())
    setSaving(false)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <Input
      label={label}
      prefix={prefix}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      error={error}
      rightIcon={<SaveIndicator saving={saving} saved={saved} />}
    />
  )
}

function SavableBio({ initial, onSave }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(false)
  const commit = async () => {
    if (value === initial) return
    const ok = await onSave(value.trim())
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium">Bio</label>
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{value.length}/150 {saved && '✓'}</span>
      </div>
      <textarea
        rows={3}
        maxLength={150}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        placeholder="What do you sell?"
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

function ImageField({ label, value, kind, userId, onChange, preview }) {
  const toast = useToast()
  const [src, setSrc] = useState(value)
  const [busy, setBusy] = useState(false)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const { url, error } = await uploadProfileImage(userId, file, kind)
    setBusy(false)
    if (error) { toast.error(error.message); return }
    setSrc(url)
    onChange(url)
    toast.success(`${label} updated`)
  }
  const remove = () => {
    setSrc(null)
    onChange(null)
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-4">
        {preview(src)}
        <div className="flex flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold tactile-press">
            {busy ? 'Uploading…' : src ? 'Change' : 'Upload'}
            <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
          </label>
          {src && <button onClick={remove} className="text-xs font-medium text-error tactile-press">Remove</button>}
        </div>
      </div>
    </div>
  )
}

function LocationField({ profile, onSave }) {
  const { detectLocation, detecting, places } = useLocation()
  const toast = useToast()
  const [town, setTown] = useState(profile?.town || '')
  const [query, setQuery] = useState('')

  const apply = async (place) => {
    setTown(place.town)
    const ok = await onSave({ town: place.town, state: place.state, location: pointFromLocation({ lat: place.lat, lon: place.lon }) })
    if (ok) toast.success('Location updated')
  }
  const detect = async () => {
    const r = await detectLocation()
    if (r) apply(r)
    else toast.error('Could not detect location')
  }
  const search = (e) => {
    e.preventDefault()
    const p = geocodePlace(query)
    if (p) { apply(p); setQuery('') }
    else toast.info('Town not found')
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">Location</label>
      {town && <p className="mb-2 rounded-xl bg-primary/8 px-3 py-2 text-sm">📍 <span className="font-semibold">{town}</span></p>}
      <div className="flex gap-2">
        <form onSubmit={search} className="flex flex-1 gap-2">
          <Input placeholder="City / area" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit" variant="secondary">Set</Button>
        </form>
      </div>
      <Button variant="outline" fullWidth className="mt-2" loading={detecting} onClick={detect} leftIcon={<PinIcon className="h-5 w-5 text-primary" />}>
        Use current location
      </Button>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {places.map((p) => (
          <Pill key={p.town} active={town === p.town} onClick={() => apply(p)}>{p.town}</Pill>
        ))}
      </div>
    </div>
  )
}

function SaveIndicator({ saving, saved }) {
  if (saving) return <span className="pr-3 text-xs text-[var(--color-text-muted)]">…</span>
  if (saved) return <span className={cn('pr-3 text-success')}>✓</span>
  return null
}

function DeleteAccountModal({ open, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const doDelete = async () => {
    setBusy(true)
    const { error } = await deactivateAccount()
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.info('Your account has been deactivated.')
    navigate('/', { replace: true })
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete account">
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          This deactivates your account and hides your data. You have a <span className="font-semibold text-[var(--color-text)]">30-day recovery window</span> before
          it's permanently removed. Type <span className="font-bold text-error">DELETE</span> to confirm.
        </p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
        <Button variant="danger" fullWidth disabled={confirm !== 'DELETE'} loading={busy} onClick={doDelete}>
          Permanently deactivate
        </Button>
      </div>
    </Modal>
  )
}
