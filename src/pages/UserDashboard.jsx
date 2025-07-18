import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useUserContent } from '../hooks/useUserContent';
import { format, differenceInYears, subYears, addDays, differenceInDays, isBefore } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTimes, FaEdit, FaUsers, FaTrash } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import '../index.css';

function UserDashboard() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, update } = useProfile();
  const { projects, achievements, loading: contentLoading, addProject, addAchievement, refresh: refreshContent } = useUserContent(user?.id);
  
  const [userSkills, setUserSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTeachingModal, setShowTeachingModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelSkillConfirm, setShowCancelSkillConfirm] = useState(false);
  const [skillToCancel, setSkillToCancel] = useState(null);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showRemoveSkillConfirm, setShowRemoveSkillConfirm] = useState(false);
  const [skillToRemove, setSkillToRemove] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    username: '',
    gender: '',
    date_of_birth: '',
    location: '',
    profession: '',
    qualification: '',
    bio: '',
    avatar_url: ''
  });

  const [teachingSkills, setTeachingSkills] = useState(['']);
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    image_url: '',
    project_url: ''
  });
  const [achievementData, setAchievementData] = useState({
    title: '',
    description: '',
    issuer: '',
    issue_date: '',
    credential_url: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false); // New state for focus tracking

  const [avatarFile, setAvatarFile] = useState(null);
  const [projectImageFile, setProjectImageFile] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchSkills();
      loadAvailableSkills();
    }
  }, [user]);

  useEffect(() => {
    if (showConnectionsModal && user?.id) {
      loadConnections();
    }
  }, [showConnectionsModal, user?.id]);

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth ? format(new Date(profile.date_of_birth), 'yyyy-MM-dd') : '',
        location: profile.location || '',
        profession: profile.profession || '',
        qualification: profile.qualification || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    return differenceInYears(new Date(), dob);
  };

  const loadAvailableSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name');
      if (error) throw error;
      setAvailableSkills(data || []);
    } catch (error) {
      console.error('Error loading available skills:', error);
      toast.error('Failed to load skills');
    }
  };

  const loadConnections = async () => {
    try {
      setLoadingConnections(true);
      const { data: followersData, error: followersError } = await supabase
        .from('user_connections')
        .select('follower:profiles!user_connections_follower_id_fkey(*)')
        .eq('following_id', user.id)
        .eq('status', 'approved');
      if (followersError) throw followersError;

      const { data: followingData, error: followingError } = await supabase
        .from('user_connections')
        .select('following:profiles!user_connections_following_id_fkey(*)')
        .eq('follower_id', user.id)
        .eq('status', 'approved');
      if (followingError) throw followingError;

      const allConnections = [
        ...followersData.map(f => f.follower),
        ...followingData.map(f => f.following)
      ];
      const uniqueConnections = Array.from(
        new Map(allConnections.map(conn => [conn.id, conn])).values()
      );
      setConnections(uniqueConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  const fetchSkills = async () => {
    try {
      setSkillsLoading(true);
      const { data: teachingSkills, error: teachingError } = await supabase
        .from('user_skills')
        .select(`
          *,
          skill:skills(*)
        `)
        .eq('user_id', user.id)
        .eq('is_teaching', true);
      if (teachingError) throw teachingError;

      const { data: learningSkills, error: learningError } = await supabase
        .from('skill_requests')
        .select(`
          *,
          skill:skills(*),
          to_user:profiles!skill_requests_to_user_id_fkey(*)
        `)
        .eq('from_user_id', user.id)
        .eq('status', 'approved');
      if (learningError) throw learningError;

      const currentLearningSkills = learningSkills.filter(request => {
        const endDate = addDays(new Date(request.created_at), 90);
        return !isBefore(endDate, new Date());
      });

      const formattedLearningSkills = currentLearningSkills.map(request => ({
        id: request.id,
        user_id: user.id,
        skill_id: request.skill_id,
        skill: request.skill,
        teacher: request.to_user,
        is_teaching: false,
        is_learning: true,
        proficiency_level: 'Learning',
        created_at: request.created_at
      }));

      setUserSkills([...teachingSkills, ...formattedLearningSkills]);
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast.error('Failed to load skills');
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const dob = new Date(profileData.date_of_birth);
      const age = calculateAge(dob);
      if (age < 13) {
        toast.error('You must be at least 13 years old');
        return;
      }

      let avatarUrl = profileData.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        if (error) throw error;
        
        const { data: publicData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = publicData.publicUrl;
      }

      const updatedProfileData = {
        ...profileData,
        avatar_url: avatarUrl,
        date_of_birth: profileData.date_of_birth
      };

      await update(updatedProfileData);
      setShowProfileModal(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleDeletePhoto = async () => {
    try {
      const urlParts = profileData.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);
      if (deleteError) throw deleteError;

      const updatedProfileData = { ...profileData, avatar_url: '' };
      await update(updatedProfileData);
      setProfileData(updatedProfileData);
      setShowDeletePhotoConfirm(false);
      toast.success('Profile photo removed successfully!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to remove profile photo');
    }
  };

  const handleAddTeachingSkillInput = () => {
    setTeachingSkills([...teachingSkills, '']);
  };

  const handleRemoveTeachingSkillInput = (index) => {
    const newSkills = teachingSkills.filter((_, i) => i !== index);
    setTeachingSkills(newSkills);
  };

  const handleAddTeachingSkills = async (e) => {
    e.preventDefault();
    try {
      const validSkills = teachingSkills.filter(skill => skill.trim() !== '');
      if (validSkills.length === 0) {
        toast.error('Please select at least one skill');
        return;
      }

      for (const skillId of validSkills) {
        const { data: userSkill, error: userSkillError } = await supabase
          .from('user_skills')
          .insert({
            user_id: user.id,
            skill_id: skillId,
            is_teaching: true,
            is_learning: false,
            proficiency_level: 'Expert'
          })
          .select(`
            *,
            skill:skills(*)
          `)
          .single();
        
        if (userSkillError) {
          if (userSkillError.code === '23505') {
            toast.error(`You already have this skill`);
            continue;
          }
          throw userSkillError;
        }
        
        setUserSkills(prev => [...prev, userSkill]);
      }
      
      setShowTeachingModal(false);
      setTeachingSkills(['']);
      toast.success('Teaching skills added successfully!');
    } catch (error) {
      console.error('Error adding teaching skills:', error);
      toast.error('Failed to add teaching skills');
    }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId)
        .eq('user_id', user.id);
      if (error) throw error;

      setUserSkills(prev => prev.filter(skill => skill.id !== skillId));
      toast.success('Skill removed successfully!');
    } catch (error) {
      console.error('Error removing skill:', error);
      toast.error('Failed to remove skill');
    }
  };

  const confirmRemoveSkill = (skill) => {
    setSkillToRemove(skill);
    setShowRemoveSkillConfirm(true);
  };

  const handleConfirmRemoveSkill = async () => {
    if (!skillToRemove) return;
    await handleRemoveSkill(skillToRemove.id);
    setShowRemoveSkillConfirm(false);
    setSkillToRemove(null);
  };

  const handleCancelSkill = async () => {
    if (!skillToCancel) return;
    try {
      const { error: updateError } = await supabase
        .from('skill_requests')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', skillToCancel.id)
        .eq('from_user_id', user.id);
      if (updateError) throw updateError;

      const notificationsToInsert = [
        {
          user_id: skillToCancel.teacher.id,
          type: 'skill_discontinued',
          title: 'Learning Session Discontinued',
          message: `${profile?.username || user.email} has discontinued learning ${skillToCancel.skill.name}`,
          is_read: false
        },
        {
          user_id: user.id,
          type: 'skill_discontinued',
          title: 'Learning Session Discontinued',
          message: `You have discontinued learning ${skillToCancel.skill.name}`,
          is_read: false
        }
      ];

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      if (notificationError) throw notificationError;

      setUserSkills(prev => prev.filter(skill => skill.id !== skillToCancel.id));
      toast.success('Learning session discontinued successfully');
    } catch (error) {
      console.error('Error discontinuing skill:', error);
      toast.error('Failed to discontinue learning session');
    } finally {
      setShowCancelSkillConfirm(false);
      setSkillToCancel(null);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectData({
      title: project.title,
      description: project.description,
      image_url: project.image_url || '',
      project_url: project.project_url || ''
    });
    setProjectImageFile(null);
    setShowProjectModal(true);
  };

  const handleEditAchievement = (achievement) => {
    setEditingAchievement(achievement);
    setAchievementData({
      title: achievement.title,
      description: achievement.description,
      issuer: achievement.issuer,
      issue_date: format(new Date(achievement.issue_date), 'yyyy-MM-dd'),
      credential_url: achievement.credential_url || ''
    });
    setShowAchievementModal(true);
  };

  const handleAddOrUpdateProject = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = projectData.image_url;
      if (projectImageFile) {
        const fileExt = projectImageFile.name.split('.').pop();
        const fileName = `${user.id}/projects/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('project-images')
          .upload(fileName, projectImageFile);
        if (error) throw error;
        
        const { data: publicData } = supabase.storage
          .from('project-images')
          .getPublicUrl(fileName);
        imageUrl = publicData.publicUrl;
      }

      if (editingProject) {
        const { error } = await supabase
          .from('user_projects')
          .update({ ...projectData, image_url: imageUrl })
          .eq('id', editingProject.id)
          .eq('user_id', user.id);
        if (error) throw error;
        await refreshContent();
        toast.success('Project updated successfully!');
      } else {
        await addProject({ ...projectData, image_url: imageUrl });
        toast.success('Project added successfully!');
      }
      
      setShowProjectModal(false);
      setProjectData({
        title: '',
        description: '',
        image_url: '',
        project_url: ''
      });
      setProjectImageFile(null);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  const handleAddOrUpdateAchievement = async (e) => {
    e.preventDefault();
    try {
      if (editingAchievement) {
        const { error } = await supabase
          .from('user_achievements')
          .update(achievementData)
          .eq('id', editingAchievement.id)
          .eq('user_id', user.id);
        if (error) throw error;
        await refreshContent();
        toast.success('Achievement updated successfully!');
      } else {
        await addAchievement(achievementData);
        toast.success('Achievement added successfully!');
      }
      
      setShowAchievementModal(false);
      setAchievementData({
        title: '',
        description: '',
        issuer: '',
        issue_date: '',
        credential_url: ''
      });
      setEditingAchievement(null);
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast.error('Failed to save achievement');
    }
  };

  const isPasswordValid = (password) => {
    const hasCapitalLetter = /^(?=.*[A-Z])/.test(password);
    const hasSmallLetter = /^(?=.*[a-z])/.test(password);
    const hasNumber = /^(?=.*[0-9])/.test(password);
    const hasSpecialChar = /^(?=.*[!@#$%^&*])/.test(password);
    const hasMinLength = password.length >= 8;

    return hasCapitalLetter && hasSmallLetter && hasNumber && hasSpecialChar && hasMinLength;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      if (!isPasswordValid(passwordData.newPassword)) {
        toast.error("Password does not meet all requirements");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error.message);
      toast.error(error.message || "Failed to update password");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;
    try {
      const table = deleteType === 'project' ? 'user_projects' : 'user_achievements';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id)
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshContent();
      toast.success(`${deleteType === 'project' ? 'Project' : 'Achievement'} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const confirmDelete = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const getDaysRemaining = (createdAt) => {
    const endDate = addDays(new Date(createdAt), 90);
    return Math.max(0, differenceInDays(endDate, new Date()));
  };

  if (profileLoading || skillsLoading || contentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Profile Overview */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center sm:items-start sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex justify-center w-full sm:w-auto">
              <div 
                className="h-40 w-40 sm:h-48 sm:w-48 rounded-full bg-gray-200 flex-shrink-0 relative cursor-pointer"
                onClick={() => profile?.avatar_url && setShowAvatarModal(true)}
              >
                {profile?.avatar_url ? (
                  <>
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-40 w-40 sm:h-48 sm:w-48 rounded-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeletePhotoConfirm(true);
                      }}
                      className="absolute bottom-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      title="Remove photo"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-full bg-gray-200" />
                )}
              </div>
            </div>
            
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{profile?.full_name || 'Complete your profile'}</h1>
                  <p className="text-gray-600">@{profile?.username}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => setShowConnectionsModal(true)}
                    className="flex items-center justify-center space-x-2 btn-primary text-sm py-2 px-3"
                  >
                    <FaUsers className="w-4 h-4" />
                    <span>Connections</span>
                  </button>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="btn-primary text-sm py-2 px-3"
                  >
                    {profile?.full_name ? 'Edit Profile' : 'Complete Profile'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-700 text-sm">{profile?.bio}</p>
              </div>
              
              {profile && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{profile.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Profession</p>
                    <p className="font-medium">{profile.profession || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Qualification</p>
                    <p className="font-medium">{profile.qualification || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Age & Birth Date</p>
                    {profile.date_of_birth ? (
                      <p className="font-medium">
                        {calculateAge(profile.date_of_birth)} years
                        <span className="text-gray-500 ml-2 text-xs">
                          ({format(new Date(profile.date_of_birth), 'MMMM d, yyyy')})
                        </span>
                      </p>
                    ) : (
                      <p className="font-medium">Not specified</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Teaching Skills */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Skills Owned</h2>
              <button
                onClick={() => setShowTeachingModal(true)}
                className="btn-primary"
              >
                Add Skills
              </button>
            </div>
            
            {userSkills.filter(skill => skill.is_teaching).length > 0 ? (
              <ul className="space-y-2">
                {userSkills
                  .filter(skill => skill.is_teaching)
                  .map(skill => (
                    <li
                      key={skill.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span>{skill.skill?.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {skill.proficiency_level}
                        </span>
                        <button
                          onClick={() => confirmRemoveSkill(skill)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No skills added yet</p>
            )}
          </div>

          {/* Learning Skills */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Learning</h2>
              <p className="text-sm text-gray-500">Skills from approved learning requests</p>
            </div>
            
            {userSkills.filter(skill => skill.is_learning).length > 0 ? (
              <ul className="space-y-2">
                {userSkills
                  .filter(skill => skill.is_learning)
                  .map(skill => (
                    <li
                      key={skill.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span>{skill.skill?.name}</span>
                        <p className="text-sm text-gray-500 mt-1">
                          Learning from: {skill.teacher?.full_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Days remaining: {getDaysRemaining(skill.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSkillToCancel(skill);
                            setShowCancelSkillConfirm(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Discontinue Learning"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No learning skills yet. Connect with teachers to start learning!</p>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Projects</h2>
            <button
              onClick={() => {
                setEditingProject(null);
                setProjectData({
                  title: '',
                  description: '',
                  image_url: '',
                  project_url: ''
                });
                setProjectImageFile(null);
                setShowProjectModal(true);
              }}
              className="btn-primary text-sm py-2 px-3"
            >
              Add Project
            </button>
          </div>
          
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-40 sm:h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 sm:h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-base sm:text-lg">{project.title}</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-primary hover:text-secondary"
                          title="Edit Project"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => confirmDelete(project, 'project')}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Project"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-3">{project.description}</p>
                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-secondary mt-2 sm:mt-3 inline-block text-xs sm:text-sm font-medium"
                      >
                        View Project
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No projects added yet</p>
          )}
        </div>

        {/* Achievements Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Achievements</h2>
            <button
              onClick={() => {
                setEditingAchievement(null);
                setAchievementData({
                  title: '',
                  description: '',
                  issuer: '',
                  issue_date: '',
                  credential_url: ''
                });
                setShowAchievementModal(true);
              }}
              className="btn-primary text-sm py-2 px-3"
            >
              Add Achievement
            </button>
          </div>
          
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base sm:text-lg">{achievement.title}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditAchievement(achievement)}
                        className="text-primary hover:text-secondary"
                        title="Edit Achievement"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => confirmDelete(achievement, 'achievement')}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Achievement"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 mb-2">{achievement.description}</p>
                  <div className="text-xs sm:text-sm text-gray-500 mb-2">
                    <p>Issued by: {achievement.issuer}</p>
                    <p>Date: {format(new Date(achievement.issue_date), 'MMMM yyyy')}</p>
                  </div>
                  {achievement.credential_url && (
                    <a
                      href={achievement.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-secondary text-xs sm:text-sm font-medium"
                    >
                      View Credential
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No achievements added yet</p>
          )}
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary"
          >
            Change Password
          </button>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Confirm Delete</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Are you sure you want to delete this {deleteType}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                    setDeleteType(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Skill Confirmation Modal */}
        {showRemoveSkillConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Remove Skill</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Are you sure you want to remove {skillToRemove?.skill?.name} from your skills?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowRemoveSkillConfirm(false);
                    setSkillToRemove(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemoveSkill}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Skill Confirmation Modal */}
        {showCancelSkillConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Discontinue Learning</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Are you sure you want to discontinue learning {skillToCancel?.skill.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowCancelSkillConfirm(false);
                    setSkillToCancel(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelSkill}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Discontinue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Photo Confirmation Modal */}
        {showDeletePhotoConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:max-w-md">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Remove Profile Photo</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Are you sure you want to remove your profile photo? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeletePhotoConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePhoto}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Full Image Modal */}
        {showAvatarModal && profile?.avatar_url && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" 
            onClick={() => setShowAvatarModal(false)}
          >
            <div className="relative max-w-full max-h-full md:max-w-[30%] md:max-h-[30%] md:mt-[-20%] lg:mt-[-25%]">
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Connections Modal */}
        {showConnectionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-bold">Your Connections</h2>
                <button
                  onClick={() => setShowConnectionsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              {loadingConnections ? (
                <div className="text-center py-8">Loading connections...</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">Connected Users ({connections.length})</h3>
                    {connections.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {connections.map(connection => (
                          <div
                            key={connection.id}
                            className="flex items-center space-x-4 p-4 border rounded-lg"
                          >
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 flex-shrink-0">
                              {connection.avatar_url && (
                                <img
                                  src={connection.avatar_url}
                                  alt={connection.full_name}
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <Link
                                to={`/profile/${connection.id}`}
                                className="font-medium hover:text-primary text-sm sm:text-base"
                              >
                                {connection.full_name}
                              </Link>
                              <p className="text-xs sm:text-sm text-gray-500">@{connection.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No connections yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-6">
                {profile?.full_name ? 'Edit Profile' : 'Complete Profile'}
              </h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="input-field text-sm"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData({ 
                        ...profileData, 
                        date_of_birth: e.target.value 
                      })}
                      max={format(subYears(new Date(), 13), 'yyyy-MM-dd')}
                      className="input-field text-sm"
                    />
                    {profileData.date_of_birth && (
                      <p className="text-xs text-gray-500 mt-1">
                        Age: {calculateAge(new Date(profileData.date_of_birth))} years
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Profession
                    </label>
                    <input
                      type="text"
                      value={profileData.profession}
                      onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={profileData.qualification}
                      onChange={(e) => setProfileData({ ...profileData, qualification: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Avatar Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files[0])}
                      className="input-field text-sm"
                    />
                    {profileData.avatar_url && (
                      <div className="mt-2">
                        <img
                          src={profileData.avatar_url}
                          alt="Current avatar"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current avatar</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={4}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      setAvatarFile(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm py-2 px-4">
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Teaching Skills Modal */}
        {showTeachingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Add Skills</h2>
              
              <form onSubmit={handleAddTeachingSkills} className="space-y-4">
                {teachingSkills.map((skill, index) => {
                  const filteredAvailableSkills = availableSkills.filter(
                    availableSkill => !userSkills.some(
                      userSkill => userSkill.is_teaching && userSkill.skill_id === availableSkill.id
                    )
                  );

                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={skill}
                        onChange={(e) => {
                          const newSkills = [...teachingSkills];
                          newSkills[index] = e.target.value;
                          setTeachingSkills(newSkills);
                        }}
                        className="input-field flex-1"
                        required
                      >
                        <option value="">Select a skill</option>
                        {filteredAvailableSkills.map(skill => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name}
                          </option>
                        ))}
                      </select>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeachingSkillInput(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  );
                })}
                
                <button
                  type="button"
                  onClick={handleAddTeachingSkillInput}
                  className="flex items-center text-primary hover:text-secondary"
                >
                  <FaPlus className="mr-2" />
                  Add Another Skill
                </button>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeachingModal(false);
                      setTeachingSkills(['']);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Skills
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                {editingProject ? 'Edit Project' : 'Add Project'}
              </h2>
              
              <form onSubmit={handleAddOrUpdateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={projectData.title}
                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    required
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    rows={3}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProjectImageFile(e.target.files[0])}
                    className="input-field text-sm"
                  />
                  {projectData.image_url && (
                    <div className="mt-2">
                      <img
                        src={projectData.image_url}
                        alt="Current project image"
                        className="w-full h-40 object-cover rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">Current image</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={projectData.project_url}
                    onChange={(e) => setProjectData({ ...projectData, project_url: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectModal(false);
                      setEditingProject(null);
                      setProjectImageFile(null);
                      setProjectData({
                        title: '',
                        description: '',
                        image_url: '',
                        project_url: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm py-2 px-4">
                    {editingProject ? 'Update Project' : 'Add Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Achievement Modal */}
        {showAchievementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                {editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
              </h2>
              
              <form onSubmit={handleAddOrUpdateAchievement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={achievementData.title}
                    onChange={(e) => setAchievementData({ ...achievementData, title: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    required
                    value={achievementData.description}
                    onChange={(e) => setAchievementData({ ...achievementData, description: e.target.value })}
                    rows={3}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Issuer
                  </label>
                  <input
                    type="text"
                    required
                    value={achievementData.issuer}
                    onChange={(e) => setAchievementData({ ...achievementData, issuer: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={achievementData.issue_date}
                    onChange={(e) => setAchievementData({ ...achievementData, issue_date: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credential URL
                  </label>
                  <input
                    type="url"
                    value={achievementData.credential_url}
                    onChange={(e) => setAchievementData({ ...achievementData, credential_url: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAchievementModal(false);
                      setEditingAchievement(null);
                      setAchievementData({
                        title: '',
                        description: '',
                        issuer: '',
                        issue_date: '',
                        credential_url: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm py-2 px-4">
                    {editingAchievement ? 'Update Achievement' : 'Add Achievement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Change Password</h2>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                    }}
                    onFocus={() => setIsNewPasswordFocused(true)}
                    onBlur={() => setIsNewPasswordFocused(false)}
                    className="input-field text-sm w-full mt-1"
                  />
                  {/* Password Requirements Tooltip - Shown only when focused */}
                  {isNewPasswordFocused && (
                    <div className="absolute left-0 bottom-full mb-2 bg-gray-800 text-white text-xs rounded-lg p-3 w-72 z-10 shadow-lg">
                      <ul className="space-y-1">
                        <li className={`flex items-center ${/^(?=.*[A-Z])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                          {/^(?=.*[A-Z])/.test(passwordData.newPassword) ? (
                            <span className="mr-2">✔</span>
                          ) : (
                            <span className="mr-2">✖</span>
                          )}
                          At least one capital letter
                        </li>
                        <li className={`flex items-center ${/^(?=.*[a-z])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                          {/^(?=.*[a-z])/.test(passwordData.newPassword) ? (
                            <span className="mr-2">✔</span>
                          ) : (
                            <span className="mr-2">✖</span>
                          )}
                          At least one small letter
                        </li>
                        <li className={`flex items-center ${/^(?=.*[0-9])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                          {/^(?=.*[0-9])/.test(passwordData.newPassword) ? (
                            <span className="mr-2">✔</span>
                          ) : (
                            <span className="mr-2">✖</span>
                          )}
                          At least one number
                        </li>
                        <li className={`flex items-center ${/^(?=.*[!@#$%^&*])/.test(passwordData.newPassword) ? 'text-green-400' : 'text-red-400'}`}>
                          {/^(?=.*[!@#$%^&*])/.test(passwordData.newPassword) ? (
                            <span className="mr-2">✔</span>
                          ) : (
                            <span className="mr-2">✖</span>
                          )}
                          At least one special character
                        </li>
                        <li className={`flex items-center ${passwordData.newPassword.length >= 8 ? 'text-green-400' : 'text-red-400'}`}>
                          {passwordData.newPassword.length >= 8 ? (
                            <span className="mr-2">✔</span>
                          ) : (
                            <span className="mr-2">✖</span>
                          )}
                          Minimum length 8
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input-field text-sm w-full mt-1"
                  />
                  {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                  )}
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isPasswordValid(passwordData.newPassword) || passwordData.newPassword !== passwordData.confirmPassword}
                    className={`btn-primary text-sm py-2 px-4 ${!isPasswordValid(passwordData.newPassword) || passwordData.newPassword !== passwordData.confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;