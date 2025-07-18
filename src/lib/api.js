import { supabase } from './supabase'

// Profile functions
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Skills functions
export const getAllSkills = async () => {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}

export const getUserSkills = async (userId) => {
  const { data, error } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skills(*)
    `)
    .eq('user_id', userId)
  
  if (error) throw error
  return data
}

export const addUserSkill = async (userId, skillId, isTeaching = false, isLearning = false) => {
  const { data, error } = await supabase
    .from('user_skills')
    .insert({
      user_id: userId,
      skill_id: skillId,
      is_teaching: isTeaching,
      is_learning: isLearning,
      proficiency_level: isTeaching ? 'expert' : 'beginner'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Skill requests functions
export const createSkillRequest = async (fromUserId, toUserId, skillId, message) => {
  const { data, error } = await supabase
    .from('skill_requests')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      skill_id: skillId,
      message
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateSkillRequest = async (requestId, status) => {
  const { data, error } = await supabase
    .from('skill_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserRequests = async (userId) => {
  const { data, error } = await supabase
    .from('skill_requests')
    .select(`
      *,
      from_user:profiles!skill_requests_from_user_id_fkey(*),
      to_user:profiles!skill_requests_to_user_id_fkey(*),
      skill:skills(*)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Sessions functions
export const createSession = async (sessionData) => {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserSessions = async (userId) => {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      teacher:profiles!sessions_teacher_id_fkey(*),
      student:profiles!sessions_student_id_fkey(*),
      skill:skills(*)
    `)
    .or(`teacher_id.eq.${userId},student_id.eq.${userId}`)
    .order('start_time')
  
  if (error) throw error
  return data
}

// Notifications functions
export const getUserNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Search functions
export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      teaching:user_skills(skill:skills(*))
    `)
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20)
  
  if (error) throw error
  return data
}

export const searchSkillUsers = async (skillId) => {
  const { data, error } = await supabase
    .from('user_skills')
    .select(`
      *,
      user:profiles(*),
      skill:skills(*)
    `)
    .eq('skill_id', skillId)
    .eq('is_teaching', true)
  
  if (error) throw error
  return data
}