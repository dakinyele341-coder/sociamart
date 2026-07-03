import LegalLayout from './LegalLayout'
import terms from '../../content/terms.md?raw'

export default function TermsPage() {
  return <LegalLayout content={terms} />
}
