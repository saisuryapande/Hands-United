import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export function useUserContent(userId) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [achievements, setAchievements] = useState([])
  const [connections, setConnections] = useState({
    followers: [],
    following: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadContent()
    }
  }, [userId])

  const loadContent = async () => {
    try {
      setLoading(true)
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Load achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false })
      
      if (achievementsError) throw achievementsError
      setAchievements(achievementsData || [])

      // Load connections
      const { data: followersData, error: followersError } = await supabase
        .from('user_connections')
        .select('follower:profiles!user_connections_follower_id_fkey(*)')
        .eq('following_id', userId)
        .eq('status', 'approved')
      
      if (followersError) throw followersError

      const { data: followingData, error: followingError } = await supabase
        .from('user_connections')
        .select('following:profiles!user_connections_following_id_fkey(*)')
        .eq('follower_id', userId)
        .eq('status', 'approved')
      
      if (followingError) throw followingError

      setConnections({
        followers: followersData?.map(f => f.follower) || [],
        following: followingData?.map(f => f.following) || []
      })
    } catch (error) {
      console.error('Error loading user content:', error)
      toast.error('Failed to load user content')
    } finally {
      setLoading(false)
    }
  }

  const addProject = async (projectData) => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .insert([{ ...projectData, user_id: user.id }])
        .select()
        .single()
      
      if (error) throw error
      
      setProjects(prev => [data, ...prev])
      return { data, error: null }
    } catch (error) {
      console.error('Error adding project:', error)
      toast.error(error.message || 'Failed to add project')
      return { data: null, error }
    }
  }

  const addAchievement = async (achievementData) => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert([{ ...achievementData, user_id: user.id }])
        .select()
        .single()
      
      if (error) throw error
      
      setAchievements(prev => [data, ...prev])
      return { data, error: null }
    } catch (error) {
      console.error('Error adding achievement:', error)
      toast.error(error.message || 'Failed to add achievement')
      return { data: null, error }
    }
  }

  const toggleConnection = async (targetUserId) => {
    try {
      const isFollowing = connections.following.some(f => f.id === targetUserId)
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
        
        if (error) throw error
        
        setConnections(prev => ({
          ...prev,
          following: prev.following.filter(f => f.id !== targetUserId)
        }))
        return { error: null }
      } else {
        // Follow
        const { data, error } = await supabase
          .from('user_connections')
          .insert([{
            follower_id: user.id,
            following_id: targetUserId,
            status: 'pending'
          }])
          .select('following:profiles!user_connections_following_id_fkey(*)')
          .single()
        
        if (error) throw error
        
        setConnections(prev => ({
          ...prev,
          following: [...prev.following, data.following]
        }))
        return { data, error: null }
      }
    } catch (error) {
      console.error('Error toggling connection:', error)
      toast.error(error.message || 'Failed to update connection')
      return { data: null, error }
    }
  }

  return {
    projects,
    achievements,
    connections,
    loading,
    addProject,
    addAchievement,
    toggleConnection,
    refresh: loadContent
  }
}