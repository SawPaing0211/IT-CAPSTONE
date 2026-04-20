import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Page Imports
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';  
import RoleSelection from './pages/RoleSelection';
import GuestDashboard from './pages/GuestDashboard';

// Admin Imports
import AdminLayout from './pages/admin/Layout';
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminBlocks from './pages/admin/Blocks';
import AdminLogs from './pages/admin/Logs';
import AdminSettings from './pages/admin/Settings';

// Instructor Imports
import InstructorLayout from './pages/instructor/Layout';
import InstructorProblems from './pages/instructor/Problems';
import CreateProblem from './pages/instructor/CreateProblem';

// Student Imports
import StudentLayout from './pages/student/Layout';
import StudentDashboard from './pages/student/Dashboard';
import StudentChallenge from './pages/student/Challenge';
import StudentLeaderboard from './pages/student/Leaderboard';
import StudentProfile from './pages/student/Profile';
import CodeEditor from './pages/student/CodeEditor';
import DebugMode from './pages/student/DebugMode';
import Sandbox from './pages/student/Sandbox';
import SubmissionHistory from './pages/student/SubmissionHistory';

// Placeholder Component
function ComingSoon({ role }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1120] text-center px-4">
      <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 max-w-md">
        <h2 className="text-2xl font-bold text-[#eab308] mb-4">
          {role} Dashboard
        </h2>
        <p className="text-gray-400 mb-6">
          This screen is under development. The prototype shows the final design.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium transition"
          >
            ← Go Back
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />  
        <Route path="/guest" element={<GuestDashboard />} />

        {/* Student Routes - Wrapped in Layout */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="code-editor" element={<CodeEditor />} />
          <Route path="debug" element={<DebugMode />} />
          <Route path="sandbox" element={<Sandbox />} />
          <Route path="history" element={<SubmissionHistory />} />
          <Route path="challenge/:id" element={<StudentChallenge />} />
          <Route path="leaderboard" element={<StudentLeaderboard />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
        
        {/* Instructor Routes - Wrapped in Layout */}
        <Route path="/instructor" element={<InstructorLayout />}>
        <Route index element={<InstructorProblems />} />
        <Route path="problems" element={<InstructorProblems />} />
        <Route path="create" element={<CreateProblem />} />
      </Route>

        {/* Admin Routes - Wrapped in Layout */}
        <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="blocks" element={<AdminBlocks />} />
        <Route path="activity" element={<AdminLogs />} />      
        <Route path="settings" element={<AdminSettings />} />  
      </Route>

        {/* Catch-all */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;