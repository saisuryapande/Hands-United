import { useNavigate } from 'react-router-dom'
import { FaComments } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

function FloatingChatButton() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  if (!user || !profile) return null

  return (
    <button
      onClick={() => navigate('/messages')}
      className="fixed bottom-4 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-secondary transition-colors z-40"
    >
      <FaComments className="w-6 h-6" />
    </button>
  )
}

export default FloatingChatButton