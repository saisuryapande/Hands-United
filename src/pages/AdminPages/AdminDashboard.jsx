import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { FaTimes, FaUser } from 'react-icons/fa'
import { format } from 'date-fns'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSkills: 0,
    todayRegistrations: 0,
    totalConnections: 0
  })
  const [skillCategories, setSkillCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [skillUsers, setSkillUsers] = useState({
    teaching: [],
    learning: []
  })
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    loadStats()
    loadSkillCategories()

    // Subscribe to skill_requests changes
    const channel = supabase
      .channel('skill_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_requests'
        },
        () => {
          // Reload skill categories when skill requests change
          loadSkillCategories()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (selectedSkill) {
      loadSkillUsers(selectedSkill.id)
    }
  }, [selectedSkill])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Get total users count (excluding admin)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get total skills count
      const { count: skillsCount } = await supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })

      // Get today's registrations
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: todayCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get total approved connections
      const { count: connectionsCount } = await supabase
        .from('user_connections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      setStats({
        totalUsers: usersCount - 1, // Subtract 1 to exclude admin
        totalSkills: skillsCount,
        todayRegistrations: todayCount,
        totalConnections: connectionsCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadSkillCategories = async () => {
    try {
      setLoading(true)
      
      // Get all skills
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .order('name')

      if (skillsError) throw skillsError

      // Group skills by category and get stats for each skill
      const categories = {}
      
      for (const skill of skills) {
        // Get teaching users count
        const { count: teachingCount } = await supabase
          .from('user_skills')
          .select('*', { count: 'exact', head: true })
          .eq('skill_id', skill.id)
          .eq('is_teaching', true)

        // Get learning users count from both user_skills and approved skill_requests
        const [{ count: learningFromSkills }, { count: learningFromRequests }] = await Promise.all([
          supabase
            .from('user_skills')
            .select('*', { count: 'exact', head: true })
            .eq('skill_id', skill.id)
            .eq('is_learning', true),
          supabase
            .from('skill_requests')
            .select('*', { count: 'exact', head: true })
            .eq('skill_id', skill.id)
            .eq('status', 'approved')
        ])

        // Total learning count is sum of both sources
        const learningCount = (learningFromSkills || 0) + (learningFromRequests || 0)

        const category = skill.category || 'Other'
        if (!categories[category]) {
          categories[category] = {
            name: category,
            skills: [],
            totalTeaching: 0,
            totalLearning: 0,
            totalSkills: 0
          }
        }

        categories[category].skills.push({
          ...skill,
          teachingCount: teachingCount || 0,
          learningCount: learningCount || 0,
          totalUsers: (teachingCount || 0) + learningCount
        })
        categories[category].totalTeaching += teachingCount || 0
        categories[category].totalLearning += learningCount
        categories[category].totalSkills += 1
      }

      // Convert to array and sort by total users
      const categoriesArray = Object.values(categories).sort(
        (a, b) => (b.totalTeaching + b.totalLearning) - (a.totalTeaching + a.totalLearning)
      )

      setSkillCategories(categoriesArray)
    } catch (error) {
      console.error('Error loading skill categories:', error)
      toast.error('Failed to load skill categories')
    } finally {
      setLoading(false)
    }
  }

  const loadSkillUsers = async (skillId) => {
    try {
      setLoadingUsers(true)

      // Get teaching users
      const { data: teachingData, error: teachingError } = await supabase
        .from('user_skills')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('skill_id', skillId)
        .eq('is_teaching', true)

      if (teachingError) throw teachingError

      // Get learning users from both user_skills and approved skill_requests
      const [{ data: learningFromSkills }, { data: learningFromRequests }] = await Promise.all([
        supabase
          .from('user_skills')
          .select(`
            *,
            user:profiles(*)
          `)
          .eq('skill_id', skillId)
          .eq('is_learning', true),
        supabase
          .from('skill_requests')
          .select(`
            *,
            from_user:profiles!skill_requests_from_user_id_fkey(*)
          `)
          .eq('skill_id', skillId)
          .eq('status', 'approved')
      ])

      // Transform skill request data to match user_skills format
      const learningFromRequestsTransformed = (learningFromRequests || []).map(request => ({
        id: request.id,
        skill_id: request.skill_id,
        user: request.from_user,
        proficiency_level: 'Beginner',
        created_at: request.created_at
      }))

      setSkillUsers({
        teaching: teachingData || [],
        learning: [...(learningFromSkills || []), ...learningFromRequestsTransformed]
      })
    } catch (error) {
      console.error('Error loading skill users:', error)
      toast.error('Failed to load skill users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSkillClick = (skill) => {
    setSelectedSkill(skill)
    setSelectedCategory(null)
  }

  if (loading) {
    return (
      <div className="text-center py-12">Loading...</div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-600">Total Users</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-600">Total Skills</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalSkills}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-600">Today's Registrations</h3>
          <p className="text-3xl font-bold mt-2">{stats.todayRegistrations}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-600">Total Connections</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalConnections}</p>
        </div>
      </div>

      {/* Skill Categories */}
      {!selectedSkill && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">Skill Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {skillCategories.map(category => (
              <div
                key={category.name}
                className="bg-gray-50 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedCategory(category)}
              >
                <h3 className="text-xl font-semibold mb-4">{category.name}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Skills Users</span>
                      <span className="font-semibold text-primary">
                        {category.totalTeaching}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ 
                          width: `${(category.totalTeaching / (category.totalTeaching + category.totalLearning || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Learning</span>
                      <span className="font-semibold text-secondary">
                        {category.totalLearning}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary"
                        style={{ 
                          width: `${(category.totalLearning / (category.totalTeaching + category.totalLearning || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Skills</span>
                      <span className="font-semibold">{category.totalSkills}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Details Modal */}
      {selectedCategory && !selectedSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                <p className="text-gray-600 mt-1">
                  {selectedCategory.totalSkills} skills available
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedCategory.skills.map(skill => (
                <div
                  key={skill.id}
                  className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSkillClick(skill)}
                >
                  <div>
                    <h3 className="font-semibold text-lg mb-3">{skill.name}</h3>
                    {skill.description && (
                      <p className="text-gray-600 text-sm mb-3">{skill.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Teaching</span>
                        <span className="font-medium text-primary">{skill.teachingCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Learning</span>
                        <span className="font-medium text-secondary">{skill.learningCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skill Users View */}
      {selectedSkill && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedSkill.name}</h2>
              {selectedSkill.description && (
                <p className="text-gray-600 mt-1">{selectedSkill.description}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedSkill(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Teaching Users */}
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Teaching ({skillUsers.teaching.length})
                </h3>
                {skillUsers.teaching.length > 0 ? (
                  <div className="space-y-4">
                    {skillUsers.teaching.map(({ user, proficiency_level }) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 p-4 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <FaUser className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                          <div className="ml-auto">
                            <span className="text-sm text-primary font-medium">
                              {proficiency_level}
                            </span>
                          </div>
                        </div>
                        {user.location && (
                          <div className="mt-2 text-sm text-gray-600">
                            Location: {user.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No users teaching this skill</p>
                )}
              </div>

              {/* Learning Users */}
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Learning ({skillUsers.learning.length})
                </h3>
                {skillUsers.learning.length > 0 ? (
                  <div className="space-y-4">
                    {skillUsers.learning.map(({ user, proficiency_level }) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 p-4 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <FaUser className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                          <div className="ml-auto">
                            <span className="text-sm text-secondary font-medium">
                              {proficiency_level}
                            </span>
                          </div>
                        </div>
                        {user.location && (
                          <div className="mt-2 text-sm text-gray-600">
                            Location: {user.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No users learning this skill</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard