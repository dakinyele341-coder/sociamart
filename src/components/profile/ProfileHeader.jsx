import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { VerifiedSellerBadge } from '../ui/Badge'
import { WhatsAppIcon, PinIcon } from '../icons'
import { formatDistance } from '../../lib/format'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { cn } from '../../lib/cn'

/**
 * Profile header: cover banner, overlapping avatar, name/verified, expandable
 * bio, location + distance, clickable stats, and action buttons.
 */
export default function ProfileHeader({
  profile,
  userId,
  distanceKm,
  stats, // { products, followers, following }
  isOwn = false,
  following = false,
  onFollow,
  onRequest,
  onEdit,
}) {
  const navigate = useNavigate()
  const [bioOpen, setBioOpen] = useState(false)
  const name = profile?.business_name || profile?.full_name || 'Store'
  const isSeller = ['seller', 'both', 'admin'].includes(profile?.role)

  const waLink = buildWhatsAppLink(profile?.whatsapp || profile?.phone, 'Hi, I found your store on SociaMart!')

  return (
    <div>
      {/* Cover banner */}
      <div className="relative h-32 w-full">
        {profile?.banner_url ? (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#FF6E40] to-[#FF5722]" />
        )}
      </div>

      <div className="px-4">
        {/* Avatar overlaps banner */}
        <div className="-mt-10 flex items-end justify-between">
          <Avatar src={profile?.avatar_url} name={name} size="xl" className="ring-4 ring-[var(--color-bg)]" />
          <div className="mb-1 flex gap-2">
            {isOwn ? (
              <Button size="sm" variant="outline" onClick={onEdit}>Edit Profile</Button>
            ) : (
              <>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" aria-label="Message on WhatsApp"
                     className="grid h-9 w-9 place-items-center rounded-full bg-success/10 text-success tactile-press">
                    <WhatsAppIcon className="h-5 w-5" />
                  </a>
                )}
                <Button size="sm" variant={following ? 'outline' : 'primary'} onClick={onFollow}>
                  {following ? 'Following' : 'Follow'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Name + verified */}
        <div className="mt-2 flex items-center gap-1.5">
          <h1 className="truncate text-xl font-extrabold font-display">{name}</h1>
          {profile?.is_verified && <VerifiedSellerBadge />}
        </div>

        {/* Bio (expandable) */}
        {profile?.bio && (
          <div className="mt-1">
            <p className={cn('text-sm text-[var(--color-text-muted)]', !bioOpen && 'line-clamp-2')}>{profile.bio}</p>
            {profile.bio.length > 90 && (
              <button onClick={() => setBioOpen((o) => !o)} className="text-xs font-semibold text-primary tactile-press">
                {bioOpen ? 'Less' : 'More'}
              </button>
            )}
          </div>
        )}

        {/* Location */}
        {(profile?.town || profile?.state) && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <PinIcon className="h-4 w-4 text-primary" />
            {profile.town || profile.state}
            {distanceKm != null && ` · ${formatDistance(distanceKm * 1000)}`}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-3 flex divide-x divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] text-center">
          <Stat label="Products" value={stats?.products ?? 0} />
          <Stat label="Followers" value={stats?.followers ?? 0} onClick={() => navigate(`/seller/${userId}/followers`)} />
          <Stat label="Following" value={stats?.following ?? 0} onClick={() => navigate(`/seller/${userId}/following`)} />
        </div>

        {/* Request item (buyers viewing a seller) */}
        {isSeller && !isOwn && (
          <Button variant="outline" fullWidth className="mt-3" onClick={onRequest}>Request Item</Button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, onClick }) {
  const inner = (
    <>
      <p className="text-lg font-extrabold font-display">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </>
  )
  return onClick ? (
    <button onClick={onClick} className="flex-1 py-2.5 tactile-press">{inner}</button>
  ) : (
    <div className="flex-1 py-2.5">{inner}</div>
  )
}
