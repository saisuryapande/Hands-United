import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useUserContent } from '../hooks/useUserContent'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { format, differenceInYears, addDays, differenceInDays, isBefore } from 'date-fns'
import { FaTimes, FaUserPlus, FaUserCheck, FaUser } from 'react-icons/fa'

function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const { profile: currentUserProfile } = useProfile()
  const { profile, loading } = useProfile(id)
  const { projects, achievements, loading: contentLoading } = useUserContent(id)
  const { createNotification } = useNotifications()
  const [userSkills, setUserSkills] = useState([])
  const [selectedSkill, setSelectedSkill] = useState('')
  const [message, setMessage] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [loading2, setLoading2] = useState(true)
  const [existingRequest, setExistingRequest] = useState(null)
  const [approvedRequests, setApprovedRequests] = useState([])
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [rejectedConnection, setRejectedConnection] = useState(null)
  const [showCancelConnectionConfirm, setShowCancelConnectionConfirm] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [connections, setConnections] = useState([])
  const [loadingConnections, setLoadingConnections] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null
    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) return null
    return differenceInYears(new Date(), dob)
  }

  const checkConnectionStatus = useCallback(async () => {
    if (!user || !id) return
    try {
      const { data: connections, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`and(follower_id.eq.${user.id},following_id.eq.${id}),and(follower_id.eq.${id},following_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (connections?.length > 0) {
        const connection = connections[0]
        if (connection.status === 'approved') {
          setConnectionStatus('connected')
          setRejectedConnection(null)
        } else if (connection.status === 'pending') {
          setConnectionStatus(connection.follower_id === user.id ? 'pending' : 'pending_approval')
          setRejectedConnection(null)
        } else if (connection.status === 'rejected' && connection.follower_id === user.id) {
          setConnectionStatus(null)
          setRejectedConnection(connection)
        } else {
          setConnectionStatus(null)
          setRejectedConnection(null)
        }
      } else {
        setConnectionStatus(null)
        setRejectedConnection(null)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }, [user, id])

  const checkExistingRequest = useCallback(async () => {
    if (!user || !id) return
    try {
      setLoading2(true)
      const { data: requests, error } = await supabase
        .from('skill_requests')
        .select(`
          *,
          skill:skills(*)
        `)
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (requests?.length > 0) {
        const pendingRequest = requests.find(r => r.status === 'pending')
        const approved = requests.filter(r => r.status === 'approved')
        
        setExistingRequest(pendingRequest || null)
        setApprovedRequests(approved || [])
      } else {
        setExistingRequest(null)
        setApprovedRequests([])
      }
    } catch (error) {
      console.error('Error checking existing request:', error)
    } finally {
      setLoading2(false)
    }
  }, [user, id])

  useEffect(() => {
    if (user && id) {
      checkConnectionStatus()
      checkExistingRequest()
      loadUserSkills()
    }
  }, [user, id, checkConnectionStatus, checkExistingRequest])

  const loadUserSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .select(`
          *,
          skill:skills(*)
        `)
        .eq('user_id', id)
        .eq('is_teaching', true)

      if (error) throw error
      setUserSkills(data || [])
    } catch (error) {
      console.error('Error loading user skills:', error)
    }
  }

  const handleConnect = async () => {
    try {
      if (rejectedConnection) {
        await supabase
          .from('user_connections')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .eq('status', 'rejected')
      }

      const { data: connection, error } = await supabase
        .from('user_connections')
        .insert({
          follower_id: user.id,
          following_id: id,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: id,
          type: 'connection_request',
          title: 'New Connection Request',
          message: `${currentUserProfile?.username || user.email} wants to connect with you.`,
          is_read: false
        })

      if (notificationError) throw notificationError

      setConnectionStatus('pending')
      setRejectedConnection(null)
      toast.success('Connection request sent!')
    } catch (error) {
      console.error('Error connecting:', error)
      toast.error('Failed to send connection request')
    }
  }

  const handleCancelConnection = async () => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .eq('status', 'pending')

      if (error) throw error

      setConnectionStatus(null)
      setShowCancelConnectionConfirm(false)
      toast.success('Connection request cancelled')
    } catch (error) {
      console.error('Error cancelling connection:', error)
      toast.error('Failed to cancel connection request')
    }
  }

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${id}),and(follower_id.eq.${id},following_id.eq.${user.id})`)
        .eq('status', 'approved')

      if (error) throw error

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: id,
          type: 'connection_removed',
          title: 'Connection Removed',
          message: `${currentUserProfile?.username || user.email} has disconnected from you.`,
          is_read: false
        })

      if (notificationError) throw notificationError

      setConnectionStatus(null)
      setShowDisconnectConfirm(false)
      toast.success('Successfully disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect')
    }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    
    if (!selectedSkill) {
      toast.error('Please select a skill')
      return
    }

    try {
      const { data: request, error: requestError } = await supabase
        .from('skill_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: id,
          skill_id: selectedSkill,
          message: message.trim(),
          status: 'pending'
        })
        .select(`
          *,
          skill:skills(*),
          from_user:profiles!skill_requests_from_user_id_fkey(*),
          to_user:profiles!skill_requests_to_user_id_fkey(*)
        `)
        .single()

      if (requestError) throw requestError

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: id,
          type: 'skill_request',
          title: 'New Learning Request',
          message: `${currentUserProfile?.username || user.email} wants to learn ${request.skill.name} from you.`,
          is_read: false
        })

      if (notificationError) throw notificationError

      setExistingRequest(request)
      setShowRequestForm(false)
      setSelectedSkill('')
      setMessage('')
      toast.success('Request sent successfully!')
    } catch (error) {
      console.error('Error sending request:', error)
      toast.error('Failed to send request')
    }
  }

  const handleCancelRequest = async () => {
    if (!existingRequest) return

    try {
      const { error } = await supabase
        .from('skill_requests')
        .delete()
        .eq('id', existingRequest.id)
        .eq('from_user_id', user.id)
        .eq('status', 'pending')

      if (error) throw error

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: id,
          type: 'skill_request_cancelled',
          title: 'Learning Request Cancelled',
          message: `${currentUserProfile?.username || user.email} has cancelled their request to learn ${existingRequest.skill.name}.`,
          is_read: false
        })

      if (notificationError) throw notificationError

      setExistingRequest(null)
      setShowCancelConfirm(false)
      toast.success('Request cancelled successfully!')
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error('Failed to cancel request')
    }
  }

  const getDaysRemaining = (request) => {
    if (!request) return 0
    const endDate = addDays(new Date(request.created_at), 90)
    return Math.max(0, differenceInDays(endDate, new Date()))
  }

  const getUserRole = (request) => {
    if (!request) return ''
    return request.from_user_id === user.id ? 'Student' : 'Teacher'
  }

  const canRequestSession = () => {
    if (approvedRequests.length === 0) return true
    const isTeacher = approvedRequests.some(request => getUserRole(request) === 'Teacher')
    const isStudent = approvedRequests.some(request => getUserRole(request) === 'Student')
    return isTeacher && !isStudent
  }

  if (loading || contentLoading || loading2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">User not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <button 
                  onClick={() => profile?.avatar_url && setShowImageModal(true)}
                  className="h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FaUser className="h-16 w-16 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {profile?.full_name || 'Anonymous User'}
                    </h1>
                    <p className="text-gray-600">@{profile?.username || 'unknown'}</p>
                  </div>

                  {/* Connection Controls */}
                  {user && user.id !== profile.id && (
                    <div className="flex flex-col gap-2 items-start md:items-end">
                      <div className="flex gap-3">
                        {connectionStatus === 'connected' ? (
                          <>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm">
                              <FaUserCheck className="mr-1.5 h-4 w-4" />
                              Connected
                            </span>
                            <button
                              onClick={() => setShowDisconnectConfirm(true)}
                              className="p-1.5 text-red-500 hover:text-red-700"
                              title="Disconnect"
                            >
                              <FaTimes className="h-5 w-5" />
                            </button>
                          </>
                        ) : connectionStatus === 'pending' ? (
                          <>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                              <FaUserPlus className="mr-1.5 h-4 w-4" />
                              Request Pending
                            </span>
                            <button
                              onClick={() => setShowCancelConnectionConfirm(true)}
                              className="p-1.5 text-red-500 hover:text-red-700"
                              title="Cancel Request"
                            >
                              <FaTimes className="h-5 w-5" />
                            </button>
                          </>
                        ) : connectionStatus === 'pending_approval' ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                            <FaUserPlus className="mr-1.5 h-4 w-4" />
                            Pending Your Approval
                          </span>
                        ) : (
                          <button
                            onClick={handleConnect}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-sm"
                          >
                            <FaUserPlus className="mr-1.5 h-4 w-4" />
                            {rejectedConnection ? 'Connect Again' : 'Connect'}
                          </button>
                        )}

                        {connectionStatus === 'connected' && !existingRequest && canRequestSession() && (
                          <button
                            onClick={() => setShowRequestForm(true)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-sm"
                          >
                            Request Session
                          </button>
                        )}
                      </div>

                      {/* Request Status */}
                      {connectionStatus === 'connected' && (approvedRequests.length > 0 || existingRequest) && (
                        <div className="mt-2 flex flex-col gap-2">
                          {approvedRequests.map((request) => (
                            <span
                              key={request.id}
                              className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs"
                            >
                              {getUserRole(request)}: {request.skill.name} ({getDaysRemaining(request)} days)
                            </span>
                          ))}
                          {existingRequest && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs">
                                Pending: {existingRequest.skill.name}
                              </span>
                              <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <FaTimes className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bio and Details */}
                <p className="mt-4 text-gray-600">{profile?.bio || 'No bio available'}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500 block">Location</span>
                    <span className="font-medium text-gray-900">
                      {profile.location || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">Profession</span>
                    <span className="font-medium text-gray-900">
                      {profile.profession || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">Qualification</span>
                    <span className="font-medium text-gray-900">
                      {profile.qualification || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block">Age & Birth Date</span>
                    <span className="font-medium text-gray-900">
                      {profile.date_of_birth ? (
                        <>
                          {calculateAge(profile.date_of_birth)} years
                          <span className="text-gray-500 ml-1">
                            ({format(new Date(profile.date_of_birth), 'MMMM d, yyyy')})
                          </span>
                        </>
                      ) : (
                        'Not specified'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teaching Skills Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Skills </h2>
          {userSkills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSkills.map(skill => (
                <div
                  key={skill.id}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <h3 className="font-semibold text-gray-900">{skill.skill.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Proficiency: {skill.proficiency_level}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No skills listed</p>
          )}
        </div>

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map(project => (
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
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">{project.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
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
        {achievements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-lg text-gray-900">{achievement.title}</h3>
                  <p className="text-gray-600 mt-2">{achievement.description}</p>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>Issued by: {achievement.issuer}</p>
                    <p>Date: {format(new Date(achievement.issue_date), 'MMMM yyyy')}</p>
                  </div>
                  {achievement.credential_url && (
                    <a
                      href={achievement.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
                    >
                      View Credential
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && profile?.avatar_url && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setShowImageModal(false)}
          >
            <div 
              className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 focus:outline-none"
              >
                <FaTimes className="h-6 w-6" />
              </button>
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Request Form Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Request Learning Session</h2>
              
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Skill
                  </label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a skill</option>
                    {userSkills.map(skill => (
                      <option key={skill.id} value={skill.skill.id}>
                        {skill.skill.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain what you want to learn..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestForm(false)
                      setSelectedSkill('')
                      setMessage('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Request Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Request</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your request for {existingRequest?.skill.name}?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancelRequest}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Connection Confirmation Modal */}
        {showCancelConnectionConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Connection Request</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your connection request?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCancelConnectionConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancelConnection}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disconnect Confirmation Modal */}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Disconnect</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to disconnect from {profile.full_name}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile