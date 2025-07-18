import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { FaTimes, FaEdit } from 'react-icons/fa'

function SkillsManagement() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddSkillModal, setShowAddSkillModal] = useState(false)
  const [showEditSkillModal, setShowEditSkillModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [skillToDelete, setSkillToDelete] = useState(null)
  const [skillToEdit, setSkillToEdit] = useState(null)
  const [skillData, setSkillData] = useState({
    name: '',
    category: '',
    description: ''
  })

  useEffect(() => {
    loadSkills()
  }, [])

  useEffect(() => {
    if (skillToEdit) {
      setSkillData({
        name: skillToEdit.name,
        category: skillToEdit.category,
        description: skillToEdit.description || ''
      })
    } else {
      setSkillData({
        name: '',
        category: '',
        description: ''
      })
    }
  }, [skillToEdit])

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
    } finally {
      setLoading(false)
    }
  }

  const handleAddSkill = async (e) => {
    e.preventDefault()
    
    if (!skillData.name || !skillData.category) {
      toast.error('Name and category are required')
      return
    }

    try {
      const { data, error } = await supabase
        .from('skills')
        .insert(skillData)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('A skill with this name already exists')
          return
        }
        throw error
      }

      setSkills([...skills, data])
      setSkillData({ name: '', category: '', description: '' })
      setShowAddSkillModal(false)
      toast.success('Skill added successfully')
    } catch (error) {
      console.error('Error adding skill:', error)
      toast.error('Failed to add skill')
    }
  }

  const handleUpdateSkill = async (e) => {
    e.preventDefault()
    
    if (!skillData.name || !skillData.category) {
      toast.error('Name and category are required')
      return
    }

    try {
      const { error } = await supabase
        .from('skills')
        .update(skillData)
        .eq('id', skillToEdit.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('A skill with this name already exists')
          return
        }
        throw error
      }

      await loadSkills() // Reload skills to get fresh data
      setSkillData({ name: '', category: '', description: '' })
      setSkillToEdit(null)
      setShowEditSkillModal(false)
      toast.success('Skill updated successfully')
    } catch (error) {
      console.error('Error updating skill:', error)
      toast.error('Failed to update skill')
    }
  }

  const handleDeleteSkill = async () => {
    if (!skillToDelete) return

    try {
      const { error } = await supabase.rpc('delete_skill', {
        target_skill_id: skillToDelete.id
      })

      if (error) throw error

      await loadSkills() // Reload skills to get fresh data
      setShowDeleteConfirm(false)
      setSkillToDelete(null)
      toast.success('Skill deleted successfully')
    } catch (error) {
      console.error('Error deleting skill:', error)
      toast.error('Failed to delete skill')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">Loading...</div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Skills Management</h2>
        <button
          onClick={() => setShowAddSkillModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary"
        >
          Add New Skill
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {skills.map(skill => (
                <tr key={skill.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {skill.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {skill.category}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate">
                      {skill.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => {
                          setSkillToEdit(skill)
                          setShowEditSkillModal(true)
                        }}
                        className="text-primary hover:text-secondary"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => {
                          setSkillToDelete(skill)
                          setShowDeleteConfirm(true)
                        }}
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

      {/* Add/Edit Skill Modal */}
      {(showAddSkillModal || showEditSkillModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">
                {showEditSkillModal ? 'Edit Skill' : 'Add New Skill'}
              </h2>
              <button
                onClick={() => {
                  setShowAddSkillModal(false)
                  setShowEditSkillModal(false)
                  setSkillToEdit(null)
                  setSkillData({ name: '', category: '', description: '' })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={showEditSkillModal ? handleUpdateSkill : handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={skillData.name}
                  onChange={(e) => setSkillData({ ...skillData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={skillData.category}
                  onChange={(e) => setSkillData({ ...skillData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={skillData.description}
                  onChange={(e) => setSkillData({ ...skillData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSkillModal(false)
                    setShowEditSkillModal(false)
                    setSkillToEdit(null)
                    setSkillData({ name: '', category: '', description: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary"
                >
                  {showEditSkillModal ? 'Update Skill' : 'Add Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Skill</h2>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete the skill "{skillToDelete?.name}"?
            </p>
            <p className="text-red-600 text-sm mb-6">
              Warning: This will also delete all related user skills, requests, and sessions.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSkillToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSkill}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SkillsManagement