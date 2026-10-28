import PlatformIcon from './PlatformIcon'

/** @deprecated Use PlatformIcon — kept for backward compatibility */
export default function PlatformBadge({ platform, size = 'sm' }) {
  const map = { xs: 'xs', sm: 'sm', lg: 'lg' }
  return <PlatformIcon platform={platform} size={map[size] || 'sm'} />
}
