/** Brand mark — same logo as the OG image. */
export default function BrandLogo({ className = 'h-10 w-10' }) {
  return (
    <img
      src="/brand-mark.png"
      alt=""
      width={40}
      height={40}
      decoding="async"
      className={className}
      aria-hidden="true"
      draggable={false}
    />
  )
}
