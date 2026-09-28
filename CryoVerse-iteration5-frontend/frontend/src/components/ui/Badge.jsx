/** Small status/label pill. variant: neutral | info | success | warning | danger */
export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={`badge badge--${variant} ${className}`.trim()}>{children}</span>
}
