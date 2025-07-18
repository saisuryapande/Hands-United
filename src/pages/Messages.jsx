import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { FaUser, FaSearch } from 'react-icons/fa'
import { format } from 'date-fns'
import Chat from '../components/Chat'
import Navbar from '../components/Navbar'

function Messages() {
  const { user } = useAuth()
  const [connections, setConnections] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastMessages, setLastMessages] = useState({})

  useEffect(() => {
    loadConnections()

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Only update if the message involves the current user
          if (payload.new && (payload.new.sender_id === user.id || payload.new.receiver_id === user.id)) {
            const otherUserId = payload.new.sender_id === user.id ? payload.new.receiver_id : payload.new.sender_id
            
            // Update lastMessages state
            setLastMessages(prev => ({
              ...prev,
              [otherUserId]: payload.new
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    if (connections.length > 0) {
      loadLastMessages()
    }
  }, [connections])

  const loadLastMessages = async () => {
    try {
      const messages = {}
      for (const connection of connections) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${connection.id}),and(sender_id.eq.${connection.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          messages[connection.id] = data
        }
      }
      setLastMessages(messages)
    } catch (error) {
      console.error('Error loading last messages:', error)
    }
  }

  const loadConnections = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_connections')
        .select(`
          *,
          follower:profiles!user_connections_follower_id_fkey(*),
          following:profiles!user_connections_following_id_fkey(*)
        `)
        .eq('status', 'approved')
        .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)

      if (error) throw error

      const transformedConnections = data.map(conn => {
        const otherUser = conn.follower_id === user.id ? conn.following : conn.follower
        return otherUser
      })

      setConnections(transformedConnections)
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load connections')
    } finally {
      setLoading(false)
    }
  }

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet'
    if (message.content) return message.content
    if (message.file_url) {
      if (message.file_type?.startsWith('image/')) return '📷 Image'
      if (message.file_type?.startsWith('video/')) return '🎥 Video'
      return '📎 File: ' + (message.file_name || 'Attachment')
    }
    return 'Message'
  }

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    return isToday ? format(date, 'p') : format(date, 'PP')
  }

  const getLastMessageTime = (userId) => {
    const message = lastMessages[userId]
    return message ? new Date(message.created_at).getTime() : 0
  }

  const filteredConnections = connections.filter(connection => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      connection.username?.toLowerCase().includes(searchLower) ||
      connection.full_name?.toLowerCase().includes(searchLower)
    )
  })

  const sortedConnections = [...filteredConnections].sort((a, b) => {
    return getLastMessageTime(b.id) - getLastMessageTime(a.id)
  })

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-4">Messages</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading connections...
              </div>
            ) : sortedConnections.length > 0 ? (
              <div className="divide-y">
                {sortedConnections.map(connection => {
                  const lastMessage = lastMessages[connection.id]
                  return (
                    <button
                      key={connection.id}
                      onClick={() => setSelectedUser(connection)}
                      className={`w-full p-4 text-left hover:bg-gray-50 flex items-center ${
                        selectedUser?.id === connection.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mr-3">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0">
                          {connection.avatar_url ? (
                            <img
                              src={connection.avatar_url}
                              alt={connection.full_name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <FaUser className="text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <div className="font-medium truncate">
                            {connection.full_name || connection.username}
                          </div>
                          {lastMessage && (
                            <div className="text-xs text-gray-500 ml-2">
                              {formatMessageTime(lastMessage.created_at)}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {lastMessage?.sender_id === user.id && 'You: '}
                          {formatLastMessage(lastMessage)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No connections found
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-gray-50 min-h-0">
          {selectedUser ? (
            <div className="h-full flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="bg-white border-b p-4 flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <FaUser className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {selectedUser.full_name || selectedUser.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lastMessages[selectedUser.id] ? 
                      `Last active ${formatMessageTime(lastMessages[selectedUser.id].created_at)}` : 
                      'No messages yet'}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 min-h-0">
                <Chat
                  otherUser={selectedUser}
                  fullPage
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a connection to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages