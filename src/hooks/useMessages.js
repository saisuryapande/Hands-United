import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export function useMessages(otherUserId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !otherUserId) return

    // Load initial messages
    loadMessages()

    // Set up realtime subscription
    const channelA = supabase.channel('messages_sent')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.receiver_id === otherUserId) {
            setMessages(prev => [...prev, payload.new].sort((a, b) => 
              new Date(a.created_at) - new Date(b.created_at)
            ))
          }
        }
      )
      .subscribe()

    const channelB = supabase.channel('messages_received')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.sender_id === otherUserId) {
            setMessages(prev => [...prev, payload.new].sort((a, b) => 
              new Date(a.created_at) - new Date(b.created_at)
            ))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelA)
      supabase.removeChannel(channelB)
    }
  }, [user?.id, otherUserId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get public URLs for all file attachments
      if (data) {
        const messagesWithUrls = await Promise.all(data.map(async (message) => {
          if (message.file_url) {
            const { data: publicUrlData } = await supabase.storage
              .from('message-attachments')
              .getPublicUrl(message.file_url)
            return { ...message, _file_url: publicUrlData?.publicUrl }
          }
          return message
        }))
        setMessages(messagesWithUrls)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content, file = null) => {
    try {
      let fileUrl = null
      let fileName = null
      let fileType = null

      if (file) {
        // Create a unique file path
        const fileExt = file.name.split('.').pop()
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const filePath = `${user.id}/${timestamp}-${randomString}.${fileExt}`

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          })

        if (uploadError) throw uploadError

        fileUrl = filePath
        fileName = file.name
        fileType = file.type
      }

      // Send message with optional file attachment
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content: content || '',
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType
        })
        .select()
        .single()

      if (error) throw error

      // Get public URL for the file
      if (data && data.file_url) {
        const { data: publicUrlData } = await supabase.storage
          .from('message-attachments')
          .getPublicUrl(data.file_url)
        data._file_url = publicUrlData?.publicUrl
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error sending message:', error)
      return { data: null, error }
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      // Get message to check for file
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (messageError) throw messageError

      if (message?.file_url) {
        // Delete file from storage
        const { error: deleteFileError } = await supabase.storage
          .from('message-attachments')
          .remove([message.file_url])

        if (deleteFileError && deleteFileError.message !== 'Object not found') {
          throw deleteFileError
        }
      }

      // Delete message
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error deleting message:', error)
      return { error }
    }
  }

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    refresh: loadMessages
  }
}