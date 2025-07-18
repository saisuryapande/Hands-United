import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export function useProfile(userId) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId || user?.id) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [userId, user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profileId = userId || user?.id
      
      if (!profileId) {
        setLoading(false)
        return
      }

      // First try to get existing profile
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching profile:', fetchError)
        toast.error('Failed to load profile')
        return
      }

      if (!data && user?.id === profileId) {
        // Profile doesn't exist, create it for the current user
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert([{ 
            id: profileId,
            username: null,
            full_name: null,
            avatar_url: null,
            is_admin: false,
            date_of_birth: null
          }])
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          toast.error('Failed to create profile')
          return
        }
        
        setProfile(newProfile)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in profile operation:', error)
      toast.error('An error occurred with your profile')
    } finally {
      setLoading(false)
    }
  }

  const update = async (updates) => {
    try {
      // Handle empty date_of_birth string
      if (updates.date_of_birth === '') {
        updates.date_of_birth = null
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId || user?.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        toast.error(error.message || 'Failed to update profile')
        return { data: null, error }
      }
      
      setProfile(data)
      toast.success('Profile updated successfully')
      return { data, error: null }
    } catch (error) {
      console.error('Error in update operation:', error)
      toast.error('An error occurred while updating your profile')
      return { data: null, error }
    }
  }

  return {
    profile,
    loading,
    update,
    refresh: loadProfile
  }
}