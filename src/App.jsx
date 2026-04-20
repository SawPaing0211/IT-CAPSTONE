import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import InstructorOverview from './pages/instructor/Overview';
import InstructorProblems from './pages/instructor/Problems';
import InstructorCreateProblem from './pages/instructor/CreateProblem';
import InstructorCourses from './pages/instructor/Courses';
import InstructorCourseDetail from './pages/instructor/CourseDetail';
import InstructorAnnouncements from './pages/instructor/Announcements';
import InstructorPlagiarism from './pages/instructor/Plagiarism';
import InstructorAnalytics from './pages/instructor/Analytics';
import InstructorLessons from './pages/instructor/Lessons'; 

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
import StudentLessons from './pages/student/Lessons'; 
// ✅ NEW IMPORT: Add this line if you created the file
import StudentAnnouncements from './pages/student/Announcements'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />  
        <Route path="/guest" element={<GuestDashboard />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="code-editor/:id?" element={<CodeEditor />} /> 
          <Route path="debug/:id?" element={<DebugMode />} /> 
          <Route path="sandbox" element={<Sandbox />} />
          <Route path="history" element={<SubmissionHistory />} />
          <Route path="challenge/:id" element={<StudentChallenge />} />
          <Route path="leaderboard" element={<StudentLeaderboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="lessons" element={<StudentLessons />} /> 
          {/* ✅ NEW ROUTE: Add this line for Announcements */}
          <Route path="announcements" element={<StudentAnnouncements />} /> 
        </Route>
        
        {/* Instructor Routes */}
        <Route path="/instructor" element={<InstructorLayout />}>
          <Route index element={<Navigate to="/instructor/dashboard" />} />
          <Route path="dashboard" element={<InstructorOverview />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="courses/:blockNumber" element={<InstructorCourseDetail />} />
          <Route path="problems" element={<InstructorProblems />} />
          <Route path="problems/create" element={<InstructorCreateProblem />} />
          <Route path="announcements" element={<InstructorAnnouncements />} />
          <Route path="plagiarism" element={<InstructorPlagiarism />} />
          <Route path="analytics" element={<InstructorAnalytics />} />
          <Route path="lessons" element={<InstructorLessons />} /> 
        </Route>

        {/* Admin Routes */}
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