import { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { isRequired } from '../../../lib/validation'

export default function StepName({ data, onNext, saving }) {
  const [firstName, setFirstName] = useState(data.first_name || '')
  const [lastName, setLastName] = useState(data.last_name || '')
  const [errors, setErrors] = useState({})

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!isRequired(firstName)) errs.first = 'We need your first name'
    if (!isRequired(lastName)) errs.last = 'We need your last name'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onNext({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Header emoji="👋" title="What should we call you?" subtitle="Your name helps buyers and sellers trust each other." />
      <Input label="First name" placeholder="e.g. Bisi" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.first} autoFocus required />
      <Input label="Last name" placeholder="e.g. Adeyemi" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.last} required />
      <Button type="submit" fullWidth size="lg" loading={saving}>Continue</Button>
    </form>
  )
}

function Header({ emoji, title, subtitle }) {
  return (
    <div>
      <span className="text-4xl">{emoji}</span>
      <h2 className="mt-3 text-2xl font-extrabold font-display tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
    </div>
  )
}
