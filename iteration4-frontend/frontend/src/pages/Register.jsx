import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Input, PasswordInput } from '../components/ui'
import useForm from '../hooks/useForm.js'
import { register } from '../services/authService.js'
import {
  PASSWORD_HINT,
  compactErrors,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validateNewPassword,
} from '../utils/validation.js'

function validate(values) {
  return compactErrors({
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
    confirmPassword: validateConfirmPassword(values.confirmPassword, values.password),
  })
}

export default function Register() {
  const navigate = useNavigate()
  const { submitting, submitError, handleSubmit, getFieldProps } = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate,
    onSubmit: async (values) => {
      // confirmPassword is a UI-only field and is never sent to the API.
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate('/login', { replace: true, state: { registered: true } })
    },
  })

  return (
    <div className="container auth-wrap">
      <div className="auth-panel">
        <div className="auth-header">
          <h1>Create an account</h1>
          <p>Join Cryoverse to contribute and manage polar-science resources.</p>
        </div>

        <Card>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <Alert variant={submitError.status === 501 ? 'info' : 'danger'}>
                {submitError.message || 'Something went wrong. Please try again.'}
              </Alert>
            )}

            <Input
              label="Full name"
              autoComplete="name"
              placeholder="Your full name"
              {...getFieldProps('name')}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              {...getFieldProps('email')}
            />
            <PasswordInput
              label="Password"
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              {...getFieldProps('password')}
            />
            <PasswordInput
              label="Confirm password"
              autoComplete="new-password"
              {...getFieldProps('confirmPassword')}
            />

            <Button type="submit" fullWidth loading={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
