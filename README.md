# 🚀 Forge.Dev - Interactive Coding Learning Platform

A full-stack web application for teaching programming with gamification, real-time code execution, and analytics.

## 📋 **Table of Contents**
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Default Accounts](#default-accounts)
- [Troubleshooting](#troubleshooting)
- [Contributors](#contributors)

---

## ✨ **Features**

### 👨‍🏫 **Instructor Dashboard**
- Create coding problems (Coding & Debugging modes)
- Multi-language support (Python, Java, C#)
- Block/Section management
- Class analytics with AI insights
- Plagiarism detection
- Student performance tracking
- Event Quest system for extra credit

### 👨‍🎓 **Student Dashboard**
- Interactive code editor with syntax highlighting
- Real-time code execution and testing
- Gamification (XP, Levels, Leaderboards)
- Progress tracking and statistics
- Problem hints with XP penalties
- Activity heatmap

### 🛡️ **Admin Panel**
- User management (Students, Instructors, Admins)
- Block/Section assignments
- System configuration
- Activity logs and audit trails
- Report generation

---

## 🛠️ **Tech Stack**

**Backend:**
- Python 3.10+
- Flask (Web Framework)
- Flask-JWT-Extended (Authentication)
- Flask-SQLAlchemy (ORM)
- PyMySQL (MySQL Connector)
- Subprocess (Code Execution Sandbox)

**Frontend:**
- React 18+
- Vite (Build Tool)
- Tailwind CSS (Styling)
- React Router (Navigation)

**Database:**
- MySQL 8.0+

---

## 📦 **Installation**

### **Prerequisites**
Install these first:
- **Python 3.10+**: https://www.python.org/downloads/
- **Node.js 18+**: https://nodejs.org/
- **MySQL 8.0+**: https://dev.mysql.com/downloads/installer/
- **Git**: https://git-scm.com/downloads

### **Step-by-Step Setup** 

#### **1. Clone the Repository**
```bash
git clone https://github.com/SawPaing0211/IT-CAPSTONE.git
cd IT-CAPSTONE


 2. Backend Setup
 # Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install flask flask-cors flask-jwt-extended flask-sqlalchemy pymysql werkzeug sqlalchemy

# Create MySQL database
# Open MySQL Workbench or command line:
mysql -u root -p
CREATE DATABASE forge_dev;
EXIT;

# Start backend server
python app.py

Backend runs on http://localhost:5000

3. Frontend Setup

# Open a NEW terminal (keep backend running)
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

Frontend runs on http://localhost:5173


Usage
Running the Project
Every time you want to run:
1. Start MySQL
2. Terminal 1 - Backend:
cd backend
venv\Scripts\activate  # Windows
python app.py

Terminal 2 - Frontend:
cd frontend
npm run dev

4.Open Browser: http://localhost:5173
Default Accounts
Admin: Admin / admin
Instructor: Instructor / instructor
Student: Student / student

(Or register new accounts via the signup page)

 Project Structure
 IT-CAPSTONE/
├── backend/                 # Flask Backend API
│   ├── app.py              # Main Flask application
│   ├── venv/               # Python virtual environment
│   └── __pycache__/        # Python cache files
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   │   ├── Admin/      # Admin dashboard pages
│   │   │   ├── Instructor/ # Instructor pages
│   │   │   └── Student/    # Student pages
│   │   ├── components/     # Reusable components
│   │   ├── assets/         # Images & static files
│   │   ├── App.jsx         # Main React component
│   │   └── main.jsx        # Entry point
│   ├── public/             # Static public files
│   ├── package.json        # Node.js dependencies
│   └── vite.config.js      # Vite configuration
├── .gitignore              # Git ignore file
└── README.md               # This file

Troubleshooting
"Module not found" errors:
# Backend:
pip install flask flask-cors flask-jwt-extended flask-sqlalchemy pymysql werkzeug sqlalchemy

# Frontend:
npm install

"Cannot connect to database":
Make sure MySQL is running
Check database name is forge_dev
Verify username/password in backend/app.py (default: root with no password)

"Port 5000 already in use":
Close any other apps using port 5000
Or change port in backend/app.py: app.run(port=5001)

"npm run dev" doesn't work:
Make sure you're in the frontend folder
Run npm install first

CORS Errors:
Ensure frontend is running on http://localhost:5173
Backend CORS is configured for this origin in app.py

Key Features Showcase
Instructor Features:
✅ Create problems with multiple languages
✅ Set problem difficulty and XP rewards
✅ Block-specific visibility
✅ Event Quest system for extra credit
✅ Real-time analytics and insights
✅ Plagiarism detection
Student Features:
✅ Professional code editor (VS Code-like)
✅ Real-time test case validation
✅ Gamification (XP, Levels, Streaks)
✅ Leaderboards
✅ Activity tracking
✅ Hint system with XP penalties
Admin Features:
✅ User management (CRUD operations)
✅ Block/Section management
✅ System configuration
✅ Activity logs and audit trails
✅ Password reset and email updates
