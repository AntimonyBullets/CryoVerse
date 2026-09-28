import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Input, PasswordInput } from '../components/ui'
import useForm from '../hooks/useForm.js'
import { login } from '../services/authService.js'
import { compactErrors, validateEmail, validateRequiredPassword } from '../utils/validation.js'
import { useAuth } from '../context/AuthContext.jsx'

function validate(values) {
  return compactErrors({
    email: validateEmail(values.email),
    password: validateRequiredPassword(values.password),
  })
}

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { submitting, submitError, handleSubmit, getFieldProps } = useForm({
    initialValues: { email: '', password: '' },
    validate,
    onSubmit: async (values) => {
      const user = await login({ email: values.email.trim(), password: values.password })
      setUser(user)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    },
  })

  return (
    <div className="container auth-wrap">
      <div className="auth-panel">
        <div className="auth-header">
          <h1>Log in</h1>
          <p>Access your Cryoverse account.</p>
        </div>

        <Card>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <Alert variant={submitError.status === 501 ? 'info' : 'danger'}>
                {submitError.message || 'Something went wrong. Please try again.'}
              </Alert>
            )}

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
              autoComplete="current-password"
              {...getFieldProps('password')}
            />

            <Button type="submit" fullWidth loading={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </Card>

        <p className="auth-switch">
          New to Cryoverse? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
