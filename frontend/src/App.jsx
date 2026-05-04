import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

// Public Components
import Landing from './components/Landing'
import Auth from './components/Auth'

// Dashboard Components
import InstructorDashboard from './pages/Instructor/InstructorDashboard'
import StudentDashboard from './pages/Student/StudentDashboard'
import AdminDashboard from './pages/Admin/AdminDashboard'

// Instructor Pages
import DashboardOverview from './pages/Instructor/DashboardOverview'
import MyClasses from './pages/Instructor/MyClasses'
import ProblemManagement from './pages/Instructor/ProblemManagement'
import CreateProblem from './pages/Instructor/CreateProblem'
import ClassDetail from './pages/Instructor/ClassDetail'
import Announcements from './pages/Instructor/Announcements'
import PlagiarismCheck from './pages/Instructor/PlagiarismCheck'
import Analytics from './pages/Instructor/Analytics'
import CourseMaterials from './pages/Instructor/CourseMaterials'
import ProblemSubmissions from './pages/Instructor/ProblemSubmissions'
import InstructorAchievements from './pages/Instructor/InstructorAchievements' 

// Student Pages
import MySubjects from './pages/Student/MySubjects'
import StudentCodeEditor from './pages/Student/StudentCodeEditor'
import ProblemList from './pages/Student/ProblemList'
import Leaderboard from './pages/Student/components/Leaderboard'
import ProgressStats from './pages/Student/components/ProgressStats'
import QuestLog from './pages/Student/QuestLog'

// Admin Pages
import UserManagement from './pages/Admin/UserManagement'
import BlocksSections from './pages/Admin/BlocksSections'
import ActivityLogs from './pages/Admin/ActivityLogs'

function AppContent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { 
          if (data.id) setUser(data); 
          else {
            localStorage.removeItem('token')
            navigate('/auth')
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          navigate('/auth')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [navigate])

  const handleLogin = (userData) => {
  setUser(userData)
  // Redirect based on role
  if (userData.role === 'instructor') navigate('/instructor')
  else if (userData.role === 'student') navigate('/student')
  else if (userData.role === 'super_admin') navigate('/admin')  // ✅ Updated
}
  
  const handleLogout = () => { 
    localStorage.removeItem('token')
    setUser(null)
    navigate('/')
  }

  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) return <Navigate to="/auth" replace />
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />
    return children
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-mono text-lg drop-shadow-lg">Summoning Forge.dev...</p>
        </div>
      </div>
    )
  }
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing onLogin={() => navigate('/auth')} />} />
      <Route path="/auth" element={<Auth onLogin={handleLogin} />} />

      {/* Instructor Routes */}
      <Route 
        path="/instructor/*" 
        element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <InstructorDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="class/:id" element={<ClassDetail />} />
        <Route path="problems" element={<ProblemManagement />} />
        <Route path="create-problem" element={<CreateProblem />} />
        <Route path="problem/:problemId/submissions" element={<ProblemSubmissions />} /> 
        <Route path="announcements" element={<Announcements />} />
        <Route path="plagiarism" element={<PlagiarismCheck />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="materials" element={<CourseMaterials />} />
        <Route path="achievements" element={<InstructorAchievements />} />
      </Route>

      {/* Student Routes */}
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route path="subjects" element={<MySubjects />} />
        <Route index element={<MySubjects />} />
        <Route path="problem/:problemId" element={<StudentCodeEditor />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="stats" element={<ProgressStats />} />
        <Route path="quest-log" element={<QuestLog />} />
      </Route>

      {/* Admin Routes */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>  // ✅ Updated
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="blocks" element={<BlocksSections />} />
        <Route path="logs" element={<ActivityLogs />} />
      </Route>

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Main App component
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App  