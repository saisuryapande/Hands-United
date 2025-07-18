import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { format, subDays, startOfDay, endOfDay, subMonths, subYears } from 'date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function Stats() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // Default to 30 days
  const [stats, setStats] = useState({
    labels: [],
    registrations: [],
    connections: [],
    skillRequests: {
      total: [],
      approved: [],
      rejected: [],
      pending: []
    }
  })

  useEffect(() => {
    loadStats()

    // Set up realtime subscription for skill requests
    const channel = supabase
      .channel('skill-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_requests'
        },
        () => {
          loadStats() // Reload stats when skill_requests table changes
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeRange])

  const loadStats = async () => {
    try {
      setLoading(true)
      const endDate = endOfDay(new Date())
      let startDate
      let interval = 'day'
      let format_string = 'MMM d'
      
      // Calculate start date and interval based on time range
      switch (timeRange) {
        case '7':
          startDate = startOfDay(subDays(endDate, 7))
          break
        case '30':
          startDate = startOfDay(subDays(endDate, 30))
          break
        case '90':
          startDate = startOfDay(subDays(endDate, 90))
          break
        case '180':
          startDate = startOfDay(subMonths(endDate, 6))
          interval = 'week'
          format_string = 'MMM d'
          break
        case '365':
          startDate = startOfDay(subYears(endDate, 1))
          interval = 'month'
          format_string = 'MMM yyyy'
          break
        case 'all':
          const { data: earliest } = await supabase
            .from('skill_requests')
            .select('created_at')
            .order('created_at', { ascending: true })
            .limit(1)
          
          startDate = earliest?.[0]?.created_at 
            ? startOfDay(new Date(earliest[0].created_at))
            : startOfDay(subYears(endDate, 1))
          interval = 'month'
          format_string = 'MMM yyyy'
          break
        default:
          startDate = startOfDay(subDays(endDate, 30))
      }

      // Calculate number of intervals
      const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      let numIntervals
      if (interval === 'day') {
        numIntervals = diffInDays
      } else if (interval === 'week') {
        numIntervals = Math.ceil(diffInDays / 7)
      } else {
        numIntervals = Math.ceil(diffInDays / 30)
      }

      // Initialize arrays for data
      const dateLabels = []
      const regData = new Array(numIntervals).fill(0)
      const connData = new Array(numIntervals).fill(0)
      const reqData = {
        total: new Array(numIntervals).fill(0),
        approved: new Array(numIntervals).fill(0),
        rejected: new Array(numIntervals).fill(0),
        pending: new Array(numIntervals).fill(0)
      }

      // Generate date labels
      for (let i = 0; i < numIntervals; i++) {
        let date
        if (interval === 'day') {
          date = subDays(endDate, numIntervals - 1 - i)
        } else if (interval === 'week') {
          date = subDays(endDate, (numIntervals - 1 - i) * 7)
        } else {
          date = subMonths(endDate, numIntervals - 1 - i)
        }
        dateLabels.push(format(date, format_string))
      }

      // Fetch all data in parallel
      const [registrationsResult, connectionsResult, requestsResult] = await Promise.all([
        // Get user registrations
        supabase
          .from('profiles')
          .select('created_at')
          .eq('is_admin', false)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Get connections
        supabase
          .from('user_connections')
          .select('created_at')
          .eq('status', 'approved')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Get skill requests
        supabase
          .from('skill_requests')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ])

      if (registrationsResult.error) throw registrationsResult.error
      if (connectionsResult.error) throw connectionsResult.error
      if (requestsResult.error) throw requestsResult.error

      const registrations = registrationsResult.data || []
      const connections = connectionsResult.data || []
      const requests = requestsResult.data || []

      // Process registrations
      registrations.forEach(reg => {
        const date = new Date(reg.created_at)
        let index
        if (interval === 'day') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24))
        } else if (interval === 'week') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 7))
        } else {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 30))
        }
        if (index >= 0 && index < numIntervals) {
          regData[index]++
        }
      })

      // Process connections
      connections.forEach(conn => {
        const date = new Date(conn.created_at)
        let index
        if (interval === 'day') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24))
        } else if (interval === 'week') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 7))
        } else {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 30))
        }
        if (index >= 0 && index < numIntervals) {
          connData[index]++
        }
      })

      // Process skill requests
      requests.forEach(request => {
        const date = new Date(request.created_at)
        let index
        if (interval === 'day') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24))
        } else if (interval === 'week') {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 7))
        } else {
          index = numIntervals - 1 - Math.floor((endDate - date) / (1000 * 60 * 60 * 24 * 30))
        }
        
        if (index >= 0 && index < numIntervals) {
          reqData.total[index]++
          if (request.status === 'approved') {
            reqData.approved[index]++
          } else if (request.status === 'rejected') {
            reqData.rejected[index]++
          } else if (request.status === 'pending') {
            reqData.pending[index]++
          }
        }
      })

      setStats({
        labels: dateLabels,
        registrations: regData,
        connections: connData,
        skillRequests: reqData
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  const registrationsData = {
    labels: stats.labels,
    datasets: [
      {
        label: 'User Registrations',
        data: stats.registrations,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3
      }
    ]
  }

  const connectionsData = {
    labels: stats.labels,
    datasets: [
      {
        label: 'User Connections',
        data: stats.connections,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3
      }
    ]
  }

  const skillRequestsData = {
    labels: stats.labels,
    datasets: [
      {
        label: 'Total Requests',
        data: stats.skillRequests.total,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3
      },
      {
        label: 'Approved Requests',
        data: stats.skillRequests.approved,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3
      },
      {
        label: 'Rejected Requests',
        data: stats.skillRequests.rejected,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3
      },
      {
        label: 'Pending Requests',
        data: stats.skillRequests.pending,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.3
      }
    ]
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platform Statistics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading statistics...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Registrations Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">User Registrations</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={registrationsData} />
            </div>
          </div>

          {/* User Connections Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">User Connections</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={connectionsData} />
            </div>
          </div>

          {/* Skill Requests Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Skill Requests</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={skillRequestsData} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stats