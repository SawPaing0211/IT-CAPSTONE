// ============================================================================
// App.jsx — top-level router
//
// PERSONAL NOTE TO FUTURE ME:
// There are TWO different patterns being used for the 3 dashboards, on purpose:
//
//   1. INSTRUCTOR dashboard = "router-driven".
//      InstructorDashboard.jsx renders <Outlet/>, so the <Route> children
//      below (classes, problems, announcements, etc.) actually swap in and
//      out inside it. Each tab = a real URL. Browser back/forward works.
//
//   2. STUDENT and ADMIN dashboards = "self-contained".
//      StudentDashboard.jsx and AdminDashboard.jsx do NOT render <Outlet/>.
//      They manage their own tabs with useState internally and decide what
//      to show themselves. So for these two, do NOT add child <Route>s —
//      there's nothing to render them into. Just point the wildcard path
//      straight at the dashboard component and let it do its own thing.
//
// If I ever forget this and add a child route under /student/* or /admin/*
// expecting it to show up, it won't — because there's no Outlet waiting
// for it. Either (a) add <Outlet/> to that dashboard and convert it to the
// router-driven pattern, or (b) keep doing internal tab state and don't
// bother with child routes for it.
// ============================================================================

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

// Public Components
import Landing from './components/Landing'
import Auth from './components/Auth'

// Dashboard Components
import InstructorDashboard from './pages/Instructor/InstructorDashboard'
import StudentDashboard from './pages/Student/StudentDashboard'
import AdminDashboard from './pages/Admin/AdminDashboard'

// Instructor Pages (only these need importing here — they're rendered via <Outlet/>)
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

// NOTE: Student and Admin sub-pages (MySubjects, Leaderboard, ProgressStats,
// QuestLog, UserManagement, ActivityLogs, etc.) are NOT imported or routed
// here anymore. StudentDashboard.jsx and AdminDashboard.jsx import and render
// them directly themselves, switched by internal tab state. Routing them here
// too was dead code — the URL would change but nothing would visually update,
// since neither dashboard has an <Outlet/> to receive it.

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
    else if (userData.role === 'administrator') navigate('/admin')
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

      {/* ── Instructor Routes — ROUTER-DRIVEN (has <Outlet/>) ──────────────
          Every child route below actually renders, because
          InstructorDashboard.jsx has <Outlet/> in its layout. */}
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

      {/* ── Student Routes — SELF-CONTAINED (no <Outlet/>) ─────────────────
          StudentDashboard manages "subjects / hall / hero / sandbox" tabs
          itself. No child routes — wildcard just hands off to it. */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* ── Admin Routes — SELF-CONTAINED (no <Outlet/>) ───────────────────
          AdminDashboard manages "dashboard / sections / users / assignments /
          activity" tabs itself. Same deal as Student above. */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

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
