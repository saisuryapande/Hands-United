import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useNotifications } from '../hooks/useNotifications'
import { FaBell, FaBars, FaTimes } from 'react-icons/fa'
import { useState } from 'react'

function Navbar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const { unreadCount } = useNotifications()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      setShowLogoutConfirm(false)
      setIsMenuOpen(false)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Show different navigation based on user type
  if (profile?.is_admin) {
    return null // Don't render navbar for admin users
  }

  return (
    <>
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-primary">Hands United</span>
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              {user && (
                <Link to="/notifications" className="relative text-gray-700 hover:text-primary mr-4">
                  <FaBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-primary"
              >
                {isMenuOpen ? (
                  <FaTimes className="h-6 w-6" />
                ) : (
                  <FaBars className="h-6 w-6" />
                )}
              </button>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/" className="text-gray-700 hover:text-primary">Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-primary">About</Link>
              <Link to="/contact" className="text-gray-700 hover:text-primary">Contact</Link>
              
              {user ? (
                <>
                  <Link to="/skills" className="text-gray-700 hover:text-primary">Skills</Link>
                  <Link to="/dashboard" className="text-gray-700 hover:text-primary">Dashboard</Link>
                  <Link to="/notifications" className="relative text-gray-700 hover:text-primary">
                    <FaBell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-gray-700 hover:text-primary"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-primary">Login</Link>
                  <Link
                    to="/signup"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              
              {user ? (
                <>
                  <Link
                    to="/skills"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Skills
                  </Link>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      setShowLogoutConfirm(true)
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:text-secondary hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add padding to account for fixed navbar */}
      <div className="h-16"></div>
    </>
  )
}

export default Navbar