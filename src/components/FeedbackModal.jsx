import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Pill from './ui/Pill'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/posthog'

const TYPES = [
  { id: 'bug', label: '🐛 Bug' },
  { id: 'suggestion', label: '💡 Suggestion' },
  { id: 'complaint', label: '😤 Complaint' },
  { id: 'praise', label: '🙌 Compliment' },
]

export default function FeedbackModal({ open, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (message.trim().length < 10) {
      toast.error('Please write at least 10 characters')
      return
    }
    setLoading(true)

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setLoading(false)
        track('feedback_submitted', { type })
        toast.success('Thank you! We read every message.')
        reset()
        onClose()
      }, 600)
      return
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      contact_email: email.trim() || user?.email || null,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Thank you! We read every message.')
      reset()
      onClose()
    }
  }

  const reset = () => {
    setMessage('')
    setEmail('')
    setType('suggestion')
  }

  return (
    <Modal open={open} onClose={onClose} title="Send feedback">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </Pill>
          ))}
        </div>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {!user && (
          <Input
            type="email"
            label="Email (optional)"
            placeholder="So we can follow up"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Button type="submit" fullWidth loading={loading}>Submit</Button>
      </form>
    </Modal>
  )
}
