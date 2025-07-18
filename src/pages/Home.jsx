import {  useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FaTimes } from 'react-icons/fa'
import { GiConqueror } from "react-icons/gi";


function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeConnections: 0,
    totalSkills: 0
  })
  const [skillCategories, setSkillCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadSkillCategories()

    // Subscribe to changes in skill_requests and user_skills
    const skillRequestsChannel = supabase
      .channel('skill_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_requests'
        },
        () => {
          loadSkillCategories()
        }
      )
      .subscribe()

    const userSkillsChannel = supabase
      .channel('user_skills_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_skills'
        },
        () => {
          loadSkillCategories()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(skillRequestsChannel)
      supabase.removeChannel(userSkillsChannel)
    }
  }, [])

  const loadStats = async () => {
    try {
      // Get total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Get active connections count
      const { count: connectionsCount, error: connectionsError } = await supabase
        .from('user_connections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      if (connectionsError) throw connectionsError

      // Get total skills count
      const { count: skillsCount, error: skillsError } = await supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })

      if (skillsError) throw skillsError

      setStats({
        totalUsers: usersCount || 0,
        activeConnections: connectionsCount || 0,
        totalSkills: skillsCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
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
        // Get teaching users count from user_skills
        const { count: teachingCount } = await supabase
          .from('user_skills')
          .select('*', { count: 'exact', head: true })
          .eq('skill_id', skill.id)
          .eq('is_teaching', true)

        // Get learning users count from both user_skills and approved skill_requests
        const [{ count: learningFromSkills }, { data: approvedRequests }] = await Promise.all([
          supabase
            .from('user_skills')
            .select('*', { count: 'exact', head: true })
            .eq('skill_id', skill.id)
            .eq('is_learning', true),
          supabase
            .from('skill_requests')
            .select('from_user_id')
            .eq('skill_id', skill.id)
            .eq('status', 'approved')
        ])

        // Count unique learners from approved requests
        const uniqueLearnersFromRequests = new Set(approvedRequests?.map(r => r.from_user_id) || [])
        const learningFromRequests = uniqueLearnersFromRequests.size

        // Total learning count is sum of both sources
        const learningCount = (learningFromSkills || 0) + learningFromRequests

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
    } finally {
      setLoading(false)
    }
  }

  const handleGetStarted = () => {
    if (user) {
      navigate('/skills')
    } else {
      navigate('/login')
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 h-[90vh] flex items-center ">
      <div className="absolute inset-0 bg-[url('/bg.jpg')] bg-cover bg-center opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
                Hands United
              </h1>
              <p className="text-xl text-black mb-8">
                Connect, Learn, and Share Skills with People Around You
              </p>
              <button
                onClick={handleGetStarted}
                className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-secondary"
              >
                Get Started
              </button>
            </div>
            <div className="hidden md:block">
              {/* Hero image placeholder */}
            </div>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-16 h-screen grid place-content-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" >
                      <path d="M16 14c2.21 0 4 1.79 4 4v1H4v-1c0-2.21 1.79-4 4-4h8z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      {/* Plus Icon */}
                      <path d="M20 8v4m2-2h-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    </div>
                    <h3 className="text-xl font-semibold mb-2">Signup</h3>
                    <p className="text-gray-600">
                      Create an account to access the platform and explore skill-sharing opportunities.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Find Skills</h3>
                    <p className="text-gray-600">
                      Browse through skills you&apos;d like to learn or teach within your community
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Connect</h3>
                    <p className="text-gray-600">
                    Engage with skilled individuals nearby and start meaningful exchanges.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" >
                      <path d="M3 10l19-7-7 19-2.75-6.25L3 10z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Skill Request</h3>
                    <p className="text-gray-600">
                    Send skill requests to your connections to learn what interests you.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Learn</h3>
                    <p className="text-gray-600">
                    Schedule personalized sessions and start building new skills.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GiConqueror className="text-4xl text-blue-600"  />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Conquer</h3>
                    <p className="text-gray-600">
                    Master your goals and achieve your dream skillset with Hands United.
                    </p>
                  </div>
                </div>
              </div>
            </section>

      {/* Skill Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Skill Categories</h2>
          {loading ? (
            <div className="text-center py-12">Loading skill categories...</div>
          ) : (
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
                        <span className="text-gray-600">Skill Users</span>
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
                        <span className="text-gray-600">Learning Users</span>
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
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-primary mb-2">
                {loading ? '...' : stats.totalUsers-1}
              </div>
              <div className="text-gray-600">Registered Users</div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-primary mb-2">
                {loading ? '...' : stats.activeConnections}
              </div>
              <div className="text-gray-600">Active Connections</div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-primary mb-2">
                {loading ? '...' : stats.totalSkills}
              </div>
              <div className="text-gray-600">Available Skills</div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Modal */}
      {selectedCategory && (
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
                  className="bg-gray-50 p-4 rounded-lg"
                >
                  <h3 className="font-semibold text-lg mb-3">{skill.name}</h3>
                  {skill.description && (
                    <p className="text-gray-600 text-sm mb-3">{skill.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Skill Users</span>
                      <span className="font-medium text-primary">{skill.teachingCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Learning Users</span>
                      <span className="font-medium text-secondary">{skill.learningCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home