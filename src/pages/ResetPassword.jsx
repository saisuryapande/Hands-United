import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const isDirectChange = location.state?.fromDashboard

  // Password validation rules
  const passwordRules = {
    hasCapital: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    hasSmall: /[a-z]/.test(password),
    hasMinLength: password.length >= 8
  }

  const isPasswordValid = Object.values(passwordRules).every(Boolean)
  const passwordsMatch = password === confirmPassword && password !== ''

  useEffect(() => {
    // Check if we have a session when the component mounts
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && !isDirectChange) {
        toast.error('Invalid or expired reset link')
        navigate('/login')
      }
    }
    checkSession()
  }, [navigate, isDirectChange])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast.error('Password does not meet all requirements')
      return
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)

      if (isDirectChange) {
        if (!user) {
          toast.error('You must be logged in to change your password')
          navigate('/login')
          return
        }

        // First verify current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        })

        if (signInError) {
          toast.error('Current password is incorrect')
          return
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      if (isDirectChange) {
        navigate('/dashboard')
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Error updating password:', error)
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
          {isDirectChange ? 'Change your password' : 'Reset your password'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isDirectChange && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                />
              </div>
              {!passwordsMatch && confirmPassword !== '' && (
                <p className="mt-2 text-sm text-red-600">
                  Passwords do not match
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch || (isDirectChange && !currentPassword)}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword