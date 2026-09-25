import { useId } from 'react'

/** Labelled text input with optional hint, error message and `trailing` slot (e.g. show/hide button). */
export default function Input({
  label,
  hint,
  error,
  id,
  trailing,
  className = '',
  ...rest
}) {
  const autoId = useId()
  const inputId = id || autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={`field ${className}`.trim()}>
      {label && <label htmlFor={inputId} className="field__label">{label}</label>}
      <div className="field__control">
        <input
          id={inputId}
          className={`field__input${error ? ' field__input--error' : ''}${trailing ? ' field__input--trailing' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing && <div className="field__trailing">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="field__error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
}
