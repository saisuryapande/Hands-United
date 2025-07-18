import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      loadNotifications()
      const channel = subscribeToNotifications()
      
      return () => {
        channel.unsubscribe()
      }
    }
  }, [user])

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev])
            if (!payload.new.is_read) {
              setUnreadCount(prev => prev + 1)
              toast.success(payload.new.title)
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            )
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    return channel
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const createNotification = async (userId, type, title, message) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          title,
          message,
          is_read: false
        }])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating notification:', error)
      return { data: null, error }
    }
  }

  return {
    notifications,
    loading,
    unreadCount,
    createNotification,
    refresh: loadNotifications
  }
}