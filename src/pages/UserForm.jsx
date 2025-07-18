import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSkills } from '../hooks/useSkills'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function UserForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { skills, loading: skillsLoading } = useSkills()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    gender: '',
    age: '',
    location: '',
    profession: '',
    qualification: '',
    bio: '',
    teaching_skills: [],
    learning_skills: []
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.username) {
      toast.error('Username is required')
      return
    }

    try {
      setLoading(true)
      
      // First create/update the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          username: formData.username,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location,
          profession: formData.profession,
          qualification: formData.qualification,
          bio: formData.bio
        })
        .select()
        .single()

      if (profileError) throw profileError

      // Add teaching skills one by one
      for (const skillId of formData.teaching_skills) {
        const { error: teachingError } = await supabase
          .from('user_skills')
          .upsert({
            user_id: user.id,
            skill_id: skillId,
            is_teaching: true,
            is_learning: false,
            proficiency_level: 'expert'
          })
        
        if (teachingError) throw teachingError
      }

      // Add learning skills one by one
      for (const skillId of formData.learning_skills) {
        const { error: learningError } = await supabase
          .from('user_skills')
          .upsert({
            user_id: user.id,
            skill_id: skillId,
            is_teaching: false,
            is_learning: true,
            proficiency_level: 'beginner'
          })
        
        if (learningError) throw learningError
      }

      toast.success('Profile completed successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing profile:', error)
      toast.error(error.message || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSkillSelection = (e, type) => {
    const options = e.target.options
    const selectedValues = []
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value)
      }
    }
    setFormData(prev => ({
      ...prev,
      [type]: selectedValues
    }))
  }

  if (skillsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading skills...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Age
                  </label>
                  <input
                    type="number"
                    min="13"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Profession
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Skills</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skills you can teach
                </label>
                <select
                  multiple
                  size={5}
                  value={formData.teaching_skills}
                  onChange={(e) => handleSkillSelection(e, 'teaching_skills')}
                  className="input-field"
                >
                  {skills.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Hold Ctrl (Windows) or Command (Mac) to select multiple skills
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skills you want to learn
                </label>
                <select
                  multiple
                  size={5}
                  value={formData.learning_skills}
                  onChange={(e) => handleSkillSelection(e, 'learning_skills')}
                  className="input-field"
                >
                  {skills.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Hold Ctrl (Windows) or Command (Mac) to select multiple skills
                </p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserForm