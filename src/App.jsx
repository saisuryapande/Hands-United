import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ResetPassword from './pages/ResetPassword'
import UserDashboard from './pages/UserDashboard'
import Skills from './pages/Skills'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import ProtectedRoute from './components/ProtectedRoute'
import FloatingChatButton from './components/FloatingChatButton'
import { useProfile } from './hooks/useProfile'
import { useAuth } from './context/AuthContext'
import AdminLayout from './pages/AdminPages/AdminLayout'
import AdminDashboard from './pages/AdminPages/AdminDashboard'
import SkillsManagement from './pages/AdminPages/SkillsManagement'
import UserManagement from './pages/AdminPages/UserManagement'
import ConnectionManagement from './pages/AdminPages/ConnectionManagement'
import AdminContacted from './pages/AdminPages/Contacted'
import Stats from './pages/AdminPages/Stats'
import { useLocation } from 'react-router-dom'

function App() {
  const { profile } = useProfile()
  const { signOut } = useAuth()
  const location = useLocation()

  // If user is admin, only show admin routes
  if (profile?.is_admin) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <ProtectedRoute admin>
              <AdminLayout onLogout={signOut} />
            </ProtectedRoute>
          }
        >
          {/* Redirect root to /admin */}
          <Route index element={<Navigate to="/admin" replace />} />
          
          {/* Admin routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/skills" element={<SkillsManagement />} />
          <Route path="admin/connections" element={<ConnectionManagement />} />
          <Route path="admin/stats" element={<Stats />} />
          <Route path="admin/contacted" element={<AdminContacted/>} />
          
          {/* Catch all route for admin - redirect to admin dashboard */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    )
  }

  // Check if we're on the messages page
  const isMessagesPage = location.pathname === '/messages'

  return (
    <div className={`min-h-screen flex flex-col ${isMessagesPage ? 'h-screen overflow-hidden' : ''}`}>
      {!isMessagesPage && <Navbar />}
      <main className={`flex-grow ${isMessagesPage ? 'h-full' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isMessagesPage && <Footer />}
      {!isMessagesPage && <FloatingChatButton />}
    </div>
  )
}

export default App