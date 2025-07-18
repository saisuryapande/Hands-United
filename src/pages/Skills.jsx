import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

function Skills() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (searchQuery) {
      filterUsers()
    } else {
      loadUsers()
    }
  }, [searchQuery])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_skills:user_skills(
            *,
            skill:skills(*)
          )
        `)
        .not('username', 'is', null) // Only get users who have set up their profile
        .eq('is_admin', false) // Exclude admin users
        .neq('id', user?.id) // Exclude current user
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(profiles || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = async () => {
    try {
      setLoading(true)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_skills:user_skills(
            *,
            skill:skills(*)
          )
        `)
        .not('username', 'is', null)
        .eq('is_admin', false) // Exclude admin users
        .neq('id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter profiles based on search query
      const searchLower = searchQuery.toLowerCase()
      const filteredProfiles = profiles?.filter(profile => {
        // Check name, username, and location
        if (
          profile.username?.toLowerCase().includes(searchLower) ||
          profile.full_name?.toLowerCase().includes(searchLower) ||
          profile.location?.toLowerCase().includes(searchLower)
        ) {
          return true
        }

        // Check teaching skills
        const hasMatchingSkill = profile.user_skills?.some(userSkill => 
          userSkill.is_teaching && 
          userSkill.skill?.name.toLowerCase().includes(searchLower)
        )

        return hasMatchingSkill
      })

      setUsers(filteredProfiles || [])
    } catch (error) {
      console.error('Error filtering users:', error)
      toast.error('Failed to filter users')
    } finally {
      setLoading(false)
    }
  }

  const getTeachingSkills = (userSkills) => {
    return userSkills?.filter(skill => skill.is_teaching) || []
  }

  const getLearningSkills = (userSkills) => {
    return userSkills?.filter(skill => skill.is_learning) || []
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <input
            type="text"
            placeholder="Search by name, username, teaching skill, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">Loading...</div>
          ) : users.length > 0 ? (
            users.map(user => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex-shrink-0">
                      {user.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <Link 
                        to={`/profile/${user.id}`}
                        className="text-lg font-semibold hover:text-primary"
                      >
                        {user.full_name}
                      </Link>
                      <p className="text-gray-600">@{user.username}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 line-clamp-2">{user.bio || 'No bio available'}</p>
                  </div>

                  {user.profession && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-700">{user.profession}</span>
                    </div>
                  )}
                  
                  {user.location && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-500">{user.location}</span>
                    </div>
                  )}

                  {/* Teaching Skills */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Teaching:</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTeachingSkills(user.user_skills).length > 0 ? (
                        getTeachingSkills(user.user_skills).map(skill => (
                          <span
                            key={skill.id}
                            className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {skill.skill?.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No teaching skills listed</span>
                      )}
                    </div>
                  </div>

                  {/* Learning Skills */}
                  
                  
                  <div className="mt-4 flex justify-end">
                    <Link
                      to={`/profile/${user.id}`}
                      className="btn-primary"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Skills