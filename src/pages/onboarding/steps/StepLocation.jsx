import { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import Pill from '../../../components/ui/Pill'
import { PinIcon } from '../../../components/icons'
import { useLocation, geocodePlace } from '../../../context/LocationContext'
import { useToast } from '../../../context/ToastContext'

export default function StepLocation({ data, onNext, onBack, saving }) {
  const { detectLocation, detecting, places } = useLocation()
  const toast = useToast()
  const [selected, setSelected] = useState(
    data.town ? { town: data.town, state: data.state } : null
  )
  const [query, setQuery] = useState('')

  const choose = (place) => {
    setSelected(place)
  }

  const detect = async () => {
    const result = await detectLocation()
    if (result) {
      setSelected(result)
      toast.success(`Found you near ${result.town}`)
    } else {
      toast.error('Could not detect location — pick a town below')
    }
  }

  const search = (e) => {
    e.preventDefault()
    const place = geocodePlace(query)
    if (place) {
      setSelected(place)
      setQuery('')
    } else {
      toast.info('Town not found — try a suggestion')
    }
  }

  const submit = () => {
    if (!selected) {
      toast.error('Choose your location to continue')
      return
    }
    onNext({
      town: selected.town,
      state: selected.state,
      location: selected.lat != null ? `POINT(${selected.lon} ${selected.lat})` : null,
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-4xl">📍</span>
        <h2 className="mt-3 text-2xl font-extrabold font-display tracking-tight">Where are you shopping from?</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">We use this to show you nearby sellers and listings.</p>
      </div>

      <Button variant="outline" fullWidth size="lg" loading={detecting} onClick={detect} leftIcon={<PinIcon className="h-5 w-5 text-primary" />}>
        Use my location
      </Button>

      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Search a town, e.g. Ogbomoso" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="secondary">Find</Button>
      </form>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Popular towns</p>
        <div className="flex flex-wrap gap-2">
          {places.map((p) => (
            <Pill key={p.town} active={selected?.town === p.town} onClick={() => choose(p)}>{p.town}</Pill>
          ))}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl bg-primary/8 px-4 py-3 text-sm">
          📌 Shopping from <span className="font-semibold">{selected.town}{selected.state ? `, ${selected.state}` : ''}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button fullWidth size="lg" loading={saving} onClick={submit}>Continue</Button>
      </div>
    </div>
  )
}
