import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { FaBell, FaTimes, FaCheck, FaUserPlus } from 'react-icons/fa'

function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [requests, setRequests] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [filter, setFilter] = useState('unread')
  const [requestsFilter, setRequestsFilter] = useState('requests')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const loadInitialData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setLoadingRequests(true)

      const [notifData, reqData, connData] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('skill_requests')
          .select(`
            *,
            from_user:profiles!skill_requests_from_user_id_fkey(id, username, full_name),
            to_user:profiles!skill_requests_to_user_id_fkey(id, username, full_name),
            skill:skills(id, name)
          `)
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_connections')
          .select(`
            *,
            follower:profiles!user_connections_follower_id_fkey(id, username, full_name),
            following:profiles!user_connections_following_id_fkey(id, username, full_name)
          `)
          .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
      ])

      if (notifData.error) throw notifData.error
      if (reqData.error) throw reqData.error
      if (connData.error) throw connData.error

      console.log('Initial notifications:', notifData.data)
      console.log('Initial skill requests:', reqData.data)
      console.log('Initial connections:', connData.data)

      setNotifications(notifData.data || [])
      setRequests(reqData.data || [])
      setConnections(connData.data || [])
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
      setLoadingRequests(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    loadInitialData()

    const channel = supabase
      .channel(`user_${user.id}_updates`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('New notification:', payload)
        setNotifications(prev => [...prev, payload.new].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Updated notification:', payload)
        setNotifications(prev => prev.map(n => 
          n.id === payload.new.id ? { ...n, ...payload.new } : n))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Deleted notification:', payload)
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'skill_requests',
        filter: `to_user_id=eq.${user.id}`
      }, (payload) => {
        console.log('New incoming skill request:', payload)
        // Fetch full data for the new request
        supabase
          .from('skill_requests')
          .select(`
            *,
            from_user:profiles!skill_requests_from_user_id_fkey(id, username, full_name),
            to_user:profiles!skill_requests_to_user_id_fkey(id, username, full_name),
            skill:skills(id, name)
          `)
          .eq('id', payload.new.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching new request:', error)
              loadInitialData()
            } else {
              setRequests(prev => [...prev, data].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)))
            }
          })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'skill_requests',
        filter: `to_user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Updated incoming skill request:', payload)
        setRequests(prev => prev.map(r => 
          r.id === payload.new.id ? { ...r, ...payload.new } : r))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'skill_requests',
        filter: `to_user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Deleted incoming skill request:', payload)
        setRequests(prev => prev.filter(r => r.id !== payload.old.id))
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_connections',
        filter: `following_id=eq.${user.id}`
      }, (payload) => {
        console.log('New incoming connection:', payload)
        supabase
          .from('user_connections')
          .select(`
            *,
            follower:profiles!user_connections_follower_id_fkey(id, username, full_name),
            following:profiles!user_connections_following_id_fkey(id, username, full_name)
          `)
          .eq('id', payload.new.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching new connection:', error)
              loadInitialData()
            } else {
              setConnections(prev => [...prev, data].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)))
            }
          })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_connections',
        filter: `following_id=eq.${user.id}`
      }, (payload) => {
        console.log('Updated incoming connection:', payload)
        setConnections(prev => prev.map(c => 
          c.id === payload.new.id ? { ...c, ...payload.new } : c))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_connections',
        filter: `following_id=eq.${user.id}`
      }, (payload) => {
        console.log('Deleted incoming connection:', payload)
        setConnections(prev => prev.filter(c => c.id !== payload.old.id))
      })
      .subscribe((status, err) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Real-time updates active')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('Subscription failed:', err)
          toast.error('Real-time updates unavailable')
          loadInitialData()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadInitialData])

  const handleMarkAsRead = async (notificationId) => {
    try {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n))
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
      
      if (error) throw error
      console.log('Marked notification as read:', notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
      loadInitialData() // Revert on error
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)
      
      if (error) throw error
      console.log('Deleted notification:', notificationId)
      toast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
      loadInitialData() // Revert on error
    }
  }

  const handleRequestAction = async (requestId, status) => {
    try {
      // Optimistic update
      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status, updated_at: new Date().toISOString() } : r))

      const { data: request, error: requestError } = await supabase
        .from('skill_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select(`
          *,
          from_user:profiles!skill_requests_from_user_id_fkey(id, username, full_name),
          to_user:profiles!skill_requests_to_user_id_fkey(id, username, full_name),
          skill:skills(id, name)
        `)
        .single()

      if (requestError) throw requestError

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: request.from_user_id,
          type: 'request_' + status,
          title: `Skill Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your skill request has been ${status}`,
          is_read: false,
          created_at: new Date().toISOString()
        }])

      if (notificationError) throw notificationError

      // Update with full data
      setRequests(prev => prev.map(r => r.id === request.id ? request : r))
      console.log('Updated request status:', request)
      toast.success(`Request ${status} successfully`)
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request')
      loadInitialData() // Revert on error
    }
  }

  const handleConnectionAction = async (connectionId, status) => {
    try {
      // Optimistic update
      setConnections(prev => prev.map(c => 
        c.id === connectionId ? { ...c, status } : c))

      const { data: connection, error: connectionError } = await supabase
        .from('user_connections')
        .update({ status })
        .eq('id', connectionId)
        .select(`
          *,
          follower:profiles!user_connections_follower_id_fkey(id, username, full_name),
          following:profiles!user_connections_following_id_fkey(id, username, full_name)
        `)
        .single()

      if (connectionError) throw connectionError

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: connection.follower_id,
          type: 'connection_' + status,
          title: `Connection Request ${status}`,
          message: `Your connection request has been ${status}`,
          is_read: false,
          created_at: new Date().toISOString()
        }])

      if (notificationError) throw notificationError

      // Update with full data
      setConnections(prev => prev.map(c => c.id === connection.id ? connection : c))
      console.log('Updated connection status:', connection)
      toast.success(`Connection request ${status}`)
    } catch (error) {
      console.error('Error updating connection request:', error)
      toast.error('Failed to update connection request')
      loadInitialData() // Revert on error
    }
  }

  const handleNewConnectionRequest = async (followingId) => {
    try {
      await supabase
        .from('user_connections')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .eq('status', 'rejected')

      const { data: connection, error: connectionError } = await supabase
        .from('user_connections')
        .insert({
          follower_id: user.id,
          following_id: followingId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          follower:profiles!user_connections_follower_id_fkey(id, username, full_name),
          following:profiles!user_connections_following_id_fkey(id, username, full_name)
        `)
        .single()

      if (connectionError) throw connectionError

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: followingId,
          type: 'connection_request',
          title: 'New Connection Request',
          message: `${user.email} wants to connect with you.`,
          is_read: false,
          created_at: new Date().toISOString()
        })

      if (notificationError) throw notificationError

      setConnections(prev => [...prev, connection].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)))
      console.log('New connection request sent:', connection)
      toast.success('New connection request sent!')
    } catch (error) {
      console.error('Error sending new connection request:', error)
      toast.error('Failed to send new connection request')
      loadInitialData() // Revert on error
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'read') return notification.is_read
    return true
  })

  const filteredRequests = [...requests, ...connections]
    .filter(item => {
      const isConnection = 'follower_id' in item
      
      if (requestsFilter === 'requests') {
        if (isConnection) {
          return item.following_id === user.id && item.status === 'pending'
        }
        return item.to_user_id === user.id && item.status === 'pending'
      }
      
      if (requestsFilter === 'sent') {
        if (isConnection) {
          return item.follower_id === user.id
        }
        return item.from_user_id === user.id
      }
      
      if (requestsFilter === 'approved') {
        if (isConnection) {
          return (item.follower_id === user.id || item.following_id === user.id) && item.status === 'approved'
        }
        return (item.from_user_id === user.id || item.to_user_id === user.id) && item.status === 'approved'
      }
      
      if (requestsFilter === 'rejected') {
        if (isConnection) {
          return (item.follower_id === user.id || item.following_id === user.id) && item.status === 'rejected'
        }
        return (item.from_user_id === user.id || item.to_user_id === user.id) && item.status === 'rejected'
      }
      
      return true
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (loading || loadingRequests) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Notifications Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold">Notifications</h1>
            
            <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setFilter('unread')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  filter === 'unread'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  filter === 'read'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Read
              </button>
            </div>
          </div>

          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read ? 'bg-white' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {format(new Date(notification.created_at), 'PPp')}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-sm text-primary hover:text-secondary"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setItemToDelete(notification)
                          setShowDeleteConfirm(true)
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Delete notification"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No notifications found
            </div>
          )}
        </div>

        {/* Requests Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Requests</h2>
            
            <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setRequestsFilter('requests')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  requestsFilter === 'requests'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => setRequestsFilter('sent')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  requestsFilter === 'sent'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => setRequestsFilter('approved')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  requestsFilter === 'approved'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setRequestsFilter('rejected')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg ${
                  requestsFilter === 'rejected'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map(request => {
                const isConnection = 'follower_id' in request
                
                return (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">
                            {isConnection ? (
                              request.follower_id === user.id ? 'Connection Request To: ' : 'Connection Request From: '
                            ) : (
                              request.from_user_id === user.id ? 'To: ' : 'From: '
                            )}
                          </span>
                          <span>
                            {isConnection ? (
                              request.follower_id === user.id 
                                ? request.following.full_name || request.following.username
                                : request.follower.full_name || request.follower.username
                            ) : (
                              request.from_user_id === user.id 
                                ? request.to_user.full_name || request.to_user.username
                                : request.from_user.full_name || request.from_user.username
                            )}
                          </span>
                        </div>
                        {!isConnection && (
                          <>
                            <p className="text-gray-600 mt-1">
                              Skill: {request.skill.name}
                            </p>
                            <p className="text-gray-600 mt-1">
                              Message: {request.message}
                            </p>
                          </>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {request.status === 'pending' 
                              ? (isConnection ? (
                                  request.follower_id === user.id ? 'Waiting for approval' : 'Pending your approval'
                                ) : (
                                  request.from_user_id === user.id ? 'Waiting for approval' : 'Pending your approval'
                                ))
                              : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(request.created_at), 'PPp')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {request.status === 'pending' && (
                          isConnection ? (
                            request.following_id === user.id && (
                              <>
                                <button
                                  onClick={() => handleConnectionAction(request.id, 'approved')}
                                  className="p-2 text-green-600 hover:text-green-800"
                                  title="Approve connection"
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  onClick={() => handleConnectionAction(request.id, 'rejected')}
                                  className="p-2 text-red-600 hover:text-red-800"
                                  title="Reject connection"
                                >
                                  <FaTimes />
                                </button>
                              </>
                            )
                          ) : (
                            request.to_user_id === user.id && (
                              <>
                                <button
                                  onClick={() => handleRequestAction(request.id, 'approved')}
                                  className="p-2 text-green-600 hover:text-green-800"
                                  title="Approve request"
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  onClick={() => handleRequestAction(request.id, 'rejected')}
                                  className="p-2 text-red-600 hover:text-red-800"
                                  title="Reject request"
                                >
                                  <FaTimes />
                                </button>
                              </>
                            )
                          )
                        )}
                        {isConnection && request.status === 'rejected' && request.follower_id === user.id && (
                          <button
                            onClick={() => handleNewConnectionRequest(request.following_id)}
                            className="p-2 text-primary hover:text-secondary"
                            title="Send new connection request"
                          >
                            <FaUserPlus />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No requests found
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold mb-4">Delete Notification</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this notification?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setItemToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteNotification(itemToDelete.id)
                    setShowDeleteConfirm(false)
                    setItemToDelete(null)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications