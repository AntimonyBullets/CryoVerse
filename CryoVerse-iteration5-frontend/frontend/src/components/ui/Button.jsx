import { Link } from 'react-router-dom'
import Spinner from './Spinner.jsx'

/**
 * Button. Pass `to` to render a router link styled as a button.
 * variant: primary | secondary | ghost | danger   size: sm | md | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    className,
  ].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size="sm" label="Loading" />}
      {children}
    </button>
  )
}
