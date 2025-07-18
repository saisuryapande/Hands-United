import { Outlet, useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { useAuth } from '../../context/AuthContext'

function AdminLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut() // Use the signOut function from AuthContext
      navigate('/login', { replace: true }) // Use replace to prevent going back
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 bg-gray-100 min-h-screen p-8 ml-64">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout