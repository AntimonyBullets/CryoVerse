import { useState } from 'react'

/**
 * Minimal form state hook.
 *  - validate(values) -> { fieldName: 'message' } (empty object when valid)
 *  - onSubmit(values) -> async; a thrown error is exposed as `submitError`
 * Errors show for a field once it has been blurred, or after a submit attempt.
 */
export default function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Derived on every render, so cross-field rules (confirm password) stay correct.
  const allErrors = validate(values)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (submitError) setSubmitError(null)
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitAttempted(true)
    setSubmitError(null)

    const firstInvalid = Object.keys(allErrors)[0]
    if (firstInvalid) {
      event.currentTarget.elements[firstInvalid]?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  /** Spread onto <Input {...getFieldProps('email')} /> */
  function getFieldProps(name) {
    return {
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] || submitAttempted ? allErrors[name] : undefined,
    }
  }

  return { values, setValues, submitting, submitError, handleSubmit, getFieldProps }
}
