import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { FaTimes, FaUser } from 'react-icons/fa'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userDetails, setUserDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadUserDetails(selectedUser.id)
    }
  }, [selectedUser])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          teaching:user_skills!user_skills_user_id_fkey(
            count
          ),
          learning:user_skills!user_skills_user_id_fkey(
            count
          )
        `)
        .eq('teaching.is_teaching', true)
        .eq('learning.is_learning', true)
        .eq('is_admin', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadUserDetails = async (userId) => {
    try {
      setLoadingDetails(true)
      const { data: skillsData, error: skillsError } = await supabase
        .from('user_skills')
        .select(`
          *,
          skill:skills(*)
        `)
        .eq('user_id', userId)

      if (skillsError) throw skillsError

      const teachingSkills = skillsData?.filter(s => s.is_teaching) || []
      const learningSkills = skillsData?.filter(s => s.is_learning) || []

      const { data: projectsData, error: projectsError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false })

      if (achievementsError) throw achievementsError

      const { data: connectionsData, error: connectionsError } = await supabase
        .from('user_connections')
        .select(`
          *,
          follower:profiles!user_connections_follower_id_fkey(*),
          following:profiles!user_connections_following_id_fkey(*)
        `)
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .eq('status', 'approved')

      if (connectionsError) throw connectionsError

      setUserDetails({
        teachingSkills,
        learningSkills,
        projects: projectsData || [],
        achievements: achievementsData || [],
        connections: connectionsData || []
      })
    } catch (error) {
      console.error('Error loading user details:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      
      setUsers(prev => prev.filter(user => user.id !== userId))
      toast.success('User deleted successfully')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const handleConfirmAction = (user, action) => {
    setSelectedUser(user)
    setConfirmMessage(`Are you sure you want to delete ${user.full_name || user.username}? This action cannot be undone.`)
    setConfirmAction(() => () => handleDeleteUser(user.id))
    setShowConfirmModal(true)
  }

  const executeConfirmedAction = () => {
    if (confirmAction) {
      confirmAction()
    }
    setShowConfirmModal(false)
    setConfirmAction(null)
    setSelectedUser(null)
  }

  const handleViewProfile = (user) => {
    setSelectedUser(user)
    setShowProfileModal(true)
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    
    // Search in basic info
    if (
      user.username?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.location?.toLowerCase().includes(searchLower) ||
      user.profession?.toLowerCase().includes(searchLower) ||
      user.qualification?.toLowerCase().includes(searchLower) ||
      user.bio?.toLowerCase().includes(searchLower)
    ) {
      return true
    }

    // Search in gender
    if (user.gender?.toLowerCase().includes(searchLower)) {
      return true
    }

    // Convert created_at to readable format and search
    const createdDate = format(new Date(user.created_at), 'PP')
    if (createdDate.toLowerCase().includes(searchLower)) {
      return true
    }

    return false
  })

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search by name, username, email, location, profession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-96"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button onClick={() => handleViewProfile(user)} className="flex items-center hover:text-primary">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <FaUser className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.location || 'Not specified'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Skills Owned: {user.teaching?.[0]?.count || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.created_at), 'PP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleConfirmAction(user, 'delete')}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <FaUser className="text-gray-400 text-2xl" />
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold">{selectedUser.full_name}</h2>
                  <p className="text-gray-600">@{selectedUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedUser(null)
                  setUserDetails(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="text-center py-8">Loading user details...</div>
            ) : userDetails ? (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{selectedUser.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium">{selectedUser.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">
                        {selectedUser.date_of_birth ? format(new Date(selectedUser.date_of_birth), 'PP') : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Profession</p>
                      <p className="font-medium">{selectedUser.profession || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Qualification</p>
                      <p className="font-medium">{selectedUser.qualification || 'Not specified'}</p>
                    </div>
                  </div>
                  {selectedUser.bio && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Bio</p>
                      <p className="mt-1">{selectedUser.bio}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Skills</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Skills Owned</h4>
                      {userDetails.teachingSkills.length > 0 ? (
                        <div className="space-y-2">
                          {userDetails.teachingSkills.map(skill => (
                            <div
                              key={skill.id}
                              className="bg-gray-50 p-2 rounded-lg flex justify-between items-center"
                            >
                              <span>{skill.skill.name}</span>
                              <span className="text-sm text-gray-500">
                                {skill.proficiency_level}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No teaching skills</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Learning</h4>
                      {userDetails.learningSkills.length > 0 ? (
                        <div className="space-y-2">
                          {userDetails.learningSkills.map(skill => (
                            <div
                              key={skill.id}
                              className="bg-gray-50 p-2 rounded-lg flex justify-between items-center"
                            >
                              <span>{skill.skill.name}</span>
                              <span className="text-sm text-gray-500">
                                {skill.proficiency_level}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No learning skills</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Projects Section */}
                {userDetails.projects.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Projects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userDetails.projects.map(project => (
                        <div
                          key={project.id}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {project.image_url ? (
                            <img
                              src={project.image_url}
                              alt={project.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-medium">{project.title}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {project.description}
                            </p>
                            {project.project_url && (
                              <a
                                href={project.project_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-secondary text-sm mt-2 inline-block"
                              >
                                View Project
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements Section */}
                {userDetails.achievements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Achievements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userDetails.achievements.map(achievement => (
                        <div
                          key={achievement.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {achievement.description}
                          </p>
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Issued by: </span>
                            <span>{achievement.issuer}</span>
                          </div>
                          <div className="mt-1 text-sm">
                            <span className="text-gray-500">Date: </span>
                            <span>{format(new Date(achievement.issue_date), 'PP')}</span>
                          </div>
                          {achievement.credential_url && (
                            <a
                              href={achievement.credential_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-secondary text-sm mt-2 inline-block"
                            >
                              View Credential
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connections Section */}
                {userDetails.connections.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Connections</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userDetails.connections.map(connection => {
                        const connectedUser = connection.follower_id === selectedUser.id
                          ? connection.following
                          : connection.follower
                        return (
                          <div
                            key={connection.id}
                            className="text-center"
                          >
                            <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto">
                              {connectedUser.avatar_url ? (
                                <img
                                  src={connectedUser.avatar_url}
                                  alt={connectedUser.full_name}
                                  className="h-16 w-16 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                  <FaUser className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 font-medium">{connectedUser.full_name}</p>
                            <p className="text-sm text-gray-500">@{connectedUser.username}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">No user details available</div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
            <p className="text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setConfirmAction(null)
                  setSelectedUser(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement