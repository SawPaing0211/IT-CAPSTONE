# Forge.Dev - Interactive Coding Learning Platform

## 🚀 Project Overview
An interactive platform for learning programming languages (Python, Java, C#) with gamified elements. Features include a coding sandbox, quest system, block/subject management, and admin controls.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Python Flask, MySQL
- **Infrastructure**: Docker (for Database & Code Sandbox)

---

## 📦 Prerequisites
Before running the project, ensure you have installed:
1.  **Node.js** (LTS version recommended)
2.  **Python 3.10+**
3.  **Git**
4.  **Docker Desktop** (Crucial for Database & Sandbox)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/SawPaing0211/IT-CAPSTONE.git
cd IT-CAPSTONE

2. Database Setup (Docker)
The project uses a MySQL database running in Docker.
Open your terminal and run:

docker run --name forge-mysql -p 3306:3306 -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -d mysql:8.0

Wait about 30 seconds for the database to initialize.


3. Backend Setup
Navigate to the backend folder and set up the Python environment:
cd backend

# Create virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# OR if requirements.txt is missing, run:
# pip install flask flask-cors flask-jwt-extended flask-sqlalchemy pymysql cryptography requests

# Run the backend server
python app.py

Backend will run on http://localhost:5000


4. Frontend Setup
Open a new terminal window in the root folder:

cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev

Frontend will run on http://localhost:5173


5. Sandbox Setup (Optional - For Code Execution)
If you want the code execution feature (Python/Java/C# sandbox) to work, build the Docker images:

cd backend/forge-sandbox
.\build_images.bat

How to Use
Login/Register: Go to http://localhost:5173 and create an account.

Admin Panel: If you are an admin, go to the Admin Dashboard to manage users and blocks.

Instructor: Create blocks, assign subjects, and create problems/quests.

Student: View subjects, attempt quests, and check progress.

Folder Structure
backend/: Flask API server
frontend/: React Client application
backend/forge-sandbox/: Dockerfiles for code execution


Rejano, Paul Christian Caleb I.
