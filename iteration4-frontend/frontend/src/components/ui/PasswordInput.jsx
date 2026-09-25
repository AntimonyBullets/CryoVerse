import { useState } from 'react'
import Input from './Input.jsx'

/** Input with a show/hide toggle. Accepts all Input props. */
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="field__toggle"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
          <span className="visually-hidden"> password</span>
        </button>
      }
    />
  )
}
