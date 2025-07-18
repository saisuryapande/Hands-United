import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export function useSkills() {
  const { user } = useAuth()
  const [skills, setSkills] = useState([])
  const [userSkills, setUserSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkills()
    if (user) {
      loadUserSkills()
    }
  }, [user])

  const loadSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name')
      
      if (error) throw error
      setSkills(data || [])
    } catch (error) {
      console.error('Error loading skills:', error)
      toast.error('Failed to load skills')
    }
  }

  const loadUserSkills = async () => {
    try {
      setLoading(true)
      
      // Get teaching skills
      const { data: teachingSkills, error: teachingError } = await supabase
        .from('user_skills')
        .select(`
          *,
          skill:skills(*)
        `)
        .eq('user_id', user.id)

      if (teachingError) throw teachingError

      // Get learning skills from approved requests
      const { data: learningSkills, error: learningError } = await supabase
        .from('skill_requests')
        .select(`
          *,
          skill:skills(*)
        `)
        .eq('from_user_id', user.id)
        .eq('status', 'approved')

      if (learningError) throw learningError

      // Convert learning skills to match teaching skills format
      const formattedLearningSkills = learningSkills.map(request => ({
        id: request.id,
        user_id: user.id,
        skill_id: request.skill_id,
        skill: request.skill,
        is_teaching: false,
        is_learning: true,
        proficiency_level: 'Beginner'
      }))

      setUserSkills([...teachingSkills, ...formattedLearningSkills])
    } catch (error) {
      console.error('Error loading user skills:', error)
      toast.error('Failed to load user skills')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = async (skillId, isTeaching, isLearning, proficiencyLevel) => {
    try {
      // Check if user already has this skill
      const { data: existingSkill } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', user.id)
        .eq('skill_id', skillId)
        .maybeSingle()

      if (existingSkill) {
        throw new Error('You already have this skill')
      }

      // Add user skill
      const { data, error } = await supabase
        .from('user_skills')
        .upsert([{
          user_id: user.id,
          skill_id: skillId,
          is_teaching: isTeaching,
          is_learning: isLearning,
          proficiency_level: proficiencyLevel || (isTeaching ? 'Expert' : 'Beginner')
        }])
        .select(`
          *,
          skill:skills(*)
        `)
        .single()
      
      if (error) throw error
      
      setUserSkills(prev => [...prev, data])
      return { data, error: null }
    } catch (error) {
      console.error('Error adding skill:', error)
      toast.error(error.message || 'Failed to add skill')
      return { data: null, error }
    }
  }

  const removeSkill = async (skillId) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setUserSkills(prev => prev.filter(skill => skill.id !== skillId))
      return { error: null }
    } catch (error) {
      console.error('Error removing skill:', error)
      toast.error(error.message || 'Failed to remove skill')
      return { error }
    }
  }

  return {
    skills,
    userSkills,
    loading,
    addSkill,
    removeSkill,
    refresh: loadUserSkills
  }
}