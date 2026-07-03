import { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { uploadImage } from '../../../lib/storage'
import { isRequired, isValidNgPhone } from '../../../lib/validation'

const BIO_MAX = 150

export default function StepBusiness({ data, onNext, onBack, saving }) {
  const { user } = useAuth()
  const toast = useToast()
  const [businessName, setBusinessName] = useState(data.business_name || '')
  const [bio, setBio] = useState(data.bio || '')
  const [whatsapp, setWhatsapp] = useState(data.whatsapp || data.phone || user?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(data.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { url, error } = await uploadImage('avatars', user?.id, file)
    setUploading(false)
    if (error) toast.error(error.message)
    else {
      setAvatarUrl(url)
      toast.success('Store photo added')
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!isRequired(businessName)) errs.name = 'Give your store a name'
    if (!isValidNgPhone(whatsapp)) errs.whatsapp = 'Enter a valid WhatsApp number'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onNext({
      business_name: businessName.trim(),
      bio: bio.trim(),
      whatsapp: whatsapp.trim(),
      avatar_url: avatarUrl || null,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <span className="text-4xl">🏪</span>
        <h2 className="mt-3 text-2xl font-extrabold font-display tracking-tight">Tell us about your business</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">This is what buyers see on your storefront.</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} name={businessName || 'Store'} size="xl" />
        <div>
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold tactile-press">
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add store photo'}
            <input type="file" accept="image/*" className="hidden" onChange={pickAvatar} disabled={uploading} />
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Optional</p>
        </div>
      </div>

      <Input label="Store name" placeholder="e.g. Bisi Couture" value={businessName} onChange={(e) => setBusinessName(e.target.value)} error={errors.name} required />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Short bio</label>
        <textarea
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you sell? What makes you special?"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-right text-xs text-[var(--color-text-muted)] tabular-nums">{bio.length}/{BIO_MAX}</p>
      </div>

      <Input label="WhatsApp number" type="tel" inputMode="numeric" prefix="+234" placeholder="801 234 5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} error={errors.whatsapp} hint="Buyers reach you here directly." required />

      <div className="flex gap-3">
        <Button variant="ghost" type="button" onClick={onBack}>Back</Button>
        <Button type="submit" fullWidth size="lg" loading={saving}>Continue</Button>
      </div>
    </form>
  )
}
