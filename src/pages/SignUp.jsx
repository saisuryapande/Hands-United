import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

function SignUp() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showTooltip, setShowTooltip] = useState(false)

  // Allowed email domains
  const allowedDomains = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'proton.me',
    'protonmail.com',
    'yahoo.com',
    'icloud.com',
    // Educational domains
    'edu',
    'org',
    'ac.uk',
    'edu.au',
    'edu.in'
  ]

  // Password validation rules
  const passwordRules = {
    hasCapital: /[A-Z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
    hasSmall: /[a-z]/.test(formData.password),
    hasMinLength: formData.password.length >= 8
  }

  const isPasswordValid = Object.values(passwordRules).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password !== ''
  
  // Email validation
  const getEmailDomain = (email) => email.split('@')[1]?.toLowerCase() || ''
  const isEmailValid = () => {
    const domain = getEmailDomain(formData.email)
    return domain && allowedDomains.some(allowed => 
      domain === allowed || domain.endsWith('.' + allowed)
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isEmailValid()) {
      toast.error('Please use a professional or educational email address')
      return
    }

    if (!passwordsMatch) {
      return
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet all requirements')
      return
    }

    try {
      setLoading(true)
      const { error } = await signUp({
        email: formData.email,
        password: formData.password,
      })
      
      if (error) throw error
      
      toast.success('Account created successfully! Please complete your profile.')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const RuleItem = ({ isValid, text }) => (
    <div className="flex items-center space-x-2">
      <span className={isValid ? "text-green-500" : "text-red-500"}>
        {isValid ? "✓" : "✗"}
      </span>
      <span className={isValid ? "text-green-500" : "text-red-500"}>
        {text}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-secondary">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                />
              </div>
              {formData.email && !isEmailValid() && (
                <p className="mt-2 text-sm text-red-600">
                  Please use a professional or educational email (e.g., Gmail, Outlook, Proton, or .edu)
                </p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  className="input-field"
                />
              </div>
              {showTooltip && (
                <div className="absolute z-10 mt-2 p-3 bg-white border rounded shadow-lg">
                  <RuleItem isValid={passwordRules.hasCapital} text="At least one capital letter" />
                  <RuleItem isValid={passwordRules.hasNumber} text="At least one number" />
                  <RuleItem isValid={passwordRules.hasSpecial} text="At least one special character" />
                  <RuleItem isValid={passwordRules.hasSmall} text="At least one small letter" />
                  <RuleItem isValid={passwordRules.hasMinLength} text="Minimum 8 characters" />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input-field"
                />
              </div>
              {!passwordsMatch && formData.confirmPassword !== '' && (
                <p className="mt-2 text-sm text-red-600">
                  Passwords do not match
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch || !isEmailValid()}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUp