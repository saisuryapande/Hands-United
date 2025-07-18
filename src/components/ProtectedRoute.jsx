import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

function ProtectedRoute({ children, admin }) {
  const { user } = useAuth()
  const { profile, loading } = useProfile()
  
  if (!user) {
    return <Navigate to="/login" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (admin && !profile?.is_admin) {
    return <Navigate to="/" />
  }

  return children
}

export default ProtectedRoute