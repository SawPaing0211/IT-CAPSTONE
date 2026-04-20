from flask import Flask, request, jsonify, send_file
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from flask_cors import CORS
import mysql.connector
from dotenv import load_dotenv
import os
import json
import subprocess
import tempfile
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid

print(" APP.PY STARTED FRESH! 🔥")

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'forge-dev-capstone-2026')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'forge-dev-capstone-2026')

#       File Upload Configuration
UPLOAD_FOLDER = 'uploads/lessons'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'forgedev')
    )
    return conn

#       Badge Checking Logic
def check_and_update_badges(user_id):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        db.close()
        return {}

    cursor.execute("SELECT COUNT(*) as count FROM submissions WHERE user_id = %s AND status = 'passed'", (user_id,))
    solved_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM submissions WHERE user_id = %s", (user_id,))
    total_submissions = cursor.fetchone()['count']

    cursor.execute("SELECT MAX(score) as max_score FROM submissions WHERE user_id = %s", (user_id,))
    max_score_row = cursor.fetchone()
    max_score = max_score_row['max_score'] if max_score_row else 0

    current_badges = user.get('badges')
    if isinstance(current_badges, str):
        try:
            badges = json.loads(current_badges)
        except:
            badges = {}
    else:
        badges = current_badges or {}

    earned_new = False

    if solved_count >= 1 and 'first_blood' not in badges:
        badges['first_blood'] = True
        earned_new = True
    if max_score == 100 and 'perfectionist' not in badges:
        badges['perfectionist'] = True
        earned_new = True
    if total_submissions >= 5 and 'grinder' not in badges:
        badges['grinder'] = True
        earned_new = True
    if user.get('streak', 0) >= 7 and 'streak_master' not in badges:
        badges['streak_master'] = True
        earned_new = True

    if earned_new:
        cursor.execute("UPDATE users SET badges = %s WHERE id = %s", (json.dumps(badges), user_id))
        db.commit()

    db.close()
    return badges

#           Helper: Log admin activity
def log_admin_activity(user_id, action, details):
    try:
        db = get_db_connection()
        cursor = db.cursor()
        ip_address = request.remote_addr or '127.0.0.1'
        cursor.execute("""
            INSERT INTO activity_logs (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
        """, (user_id, action, details, ip_address))
        db.commit()
        db.close()
    except Exception as e:
        print(f"Error logging admin activity: {e}")

#        Check maintenance mode (allow admin always)
def check_maintenance_mode(user_id):
    """Returns True if maintenance mode is ON and user is NOT admin"""
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        db.close()
        return False
    
    if user['role'] == 'admin':
        db.close()
        return False
    
    cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_mode'")
    setting = cursor.fetchone()
    db.close()
    
    if setting and setting['setting_value'] == 'true':
        return True
    
    return False

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')
    block = data.get('block')
    
    if not name or not email or not password:
        return jsonify({"msg": "Missing required fields"}), 400
    
    if role not in ['student', 'instructor', 'admin']:
        return jsonify({"msg": "Invalid role selected"}), 400
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        db.close()
        return jsonify({"msg": "Email already registered"}), 409
    
    cursor.execute("""
        INSERT INTO users (name, email, password, role, xp, level, streak, badges, block)
        VALUES (%s, %s, %s, %s, 0, 1, 0, '{}', %s)
    """, (name, email, password, role, block))
    
    user_id = cursor.lastrowid
    db.commit()
    db.close()
    
    access_token = create_access_token(identity=str(user_id))
    
    return jsonify({
        "msg": "Adventurer created successfully!",
        "token": access_token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "block": block,
            "level": 1,
            "xp": 0
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"msg": "Missing credentials"}), 400
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    db.close()
    
    if not user or user['password'] != password:
        return jsonify({"msg": "Invalid credentials"}), 401
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_mode'")
    setting = cursor.fetchone()
    db.close()
    
    maintenance_mode_on = setting and setting['setting_value'] == 'true'
    is_admin = user['role'] == 'admin'
    
    if maintenance_mode_on and not is_admin:
        return jsonify({
            "msg": "System is under maintenance. Please try again later.",
            "maintenance_mode": True
        }), 503
    
    access_token = create_access_token(identity=str(user['id']))
    
    return jsonify({
        "msg": "Login successful",
        "token": access_token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role'],
            "block": user.get('block'),
            "level": user.get('level', 1),
            "xp": user.get('xp', 0)
        }
    }), 200

@app.route('/api/problems/<int:problem_id>', methods=['GET'])
@jwt_required()
def get_problem(problem_id):
    user_id = get_jwt_identity()
    
    if check_maintenance_mode(user_id):
        return jsonify({
            "msg": "System is under maintenance. Please try again later.",
            "maintenance_mode": True
        }), 503
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM problems WHERE id = %s", (problem_id,))
    problem = cursor.fetchone()
    
    if not problem:
        return jsonify({"msg": "Problem not found"}), 404
    
    db.close()
    return jsonify(problem), 200

@app.route('/api/submit', methods=['POST'])
@jwt_required()
def submit_code():
    user_id = get_jwt_identity()
    
    if check_maintenance_mode(user_id):
        return jsonify({
            "msg": "System is under maintenance. Please try again later.",
            "maintenance_mode": True
        }), 503
    
    data = request.get_json()
    problem_id = data.get('problem_id')
    code = data.get('code')
    language = data.get('language', 'python') # Options: python, java, csharp
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM problems WHERE id = %s", (problem_id,))
    problem = cursor.fetchone()
    
    if not problem:
        db.close()
        return jsonify({"msg": "Problem not found"}), 404
    
    test_cases = json.loads(problem['test_cases'])
    results = []
    all_passed = True
    total_score = 0
    
    # ✅ Determine file extension (Java, Python, C# ONLY)
    file_ext = '.py'
    
    if language == 'java':
        file_ext = '.java'
    elif language == 'csharp':
        file_ext = '.cs'
    # Removed C++ and JavaScript

    for test in test_cases:
        expected = test['expected']
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix=file_ext, delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            actual = ""
            passed = False
            
            # Handle Compilation & Execution based on Language
            if language == 'java':
                # 1. Compile Java
                compile_proc = subprocess.run(['javac', temp_file], capture_output=True, text=True, timeout=10)
                if compile_proc.returncode != 0:
                    raise Exception(f"Compilation Error: {compile_proc.stderr}")
                
                # 2. Run Java
                class_name = "Main" 
                dir_path = os.path.dirname(temp_file)
                run_proc = subprocess.run(['java', '-cp', dir_path, class_name], 
                                          input=test['input'], text=True, capture_output=True, timeout=5)
                actual = run_proc.stdout.strip()
                if run_proc.returncode != 0:
                    raise Exception(f"Runtime Error: {run_proc.stderr}")

            elif language == 'csharp':
                # ✅ NEW: C# Logic
                # 1. Compile C# using csc (C# Compiler)
                exe_name = temp_file.replace('.cs', '.exe')
                
                compile_proc = subprocess.run(['csc', f'/out:{exe_name}', temp_file], capture_output=True, text=True, timeout=10)
                if compile_proc.returncode != 0:
                    raise Exception(f"Compilation Error: {compile_proc.stderr}")
                
                # 2. Run C# executable
                run_proc = subprocess.run([exe_name], 
                                          input=test['input'], text=True, capture_output=True, timeout=5)
                actual = run_proc.stdout.strip()
                if run_proc.returncode != 0:
                    raise Exception(f"Runtime Error: {run_proc.stderr}")

            else:
                # Python (Default)
                exec_cmd = ['python']
                process = subprocess.run(
                    exec_cmd + [temp_file],
                    input=test['input'],
                    text=True,
                    capture_output=True,
                    timeout=5
                )
                actual = process.stdout.strip()
                if process.returncode != 0:
                    raise Exception(f"Error: {process.stderr}")

            passed = actual == expected
            score = 100 if passed else 0
            
            if passed:
                total_score += score
            else:
                all_passed = False
            
            results.append({
                "case": test['case'],
                "status": "passed" if passed else "failed",
                "expected": expected,
                "actual": actual
            })
            
            # Cleanup temp files
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            
            # ✅ Cleanup C# executable
            if language == 'csharp' and 'exe_name' in locals() and os.path.exists(exe_name):
                os.unlink(exe_name)
            
            # Cleanup Java class files
            if language == 'java' and os.path.exists(os.path.join(os.path.dirname(temp_file), f"{class_name}.class")):
                os.unlink(os.path.join(os.path.dirname(temp_file), f"{class_name}.class"))
            
        except Exception as e:
            results.append({
                "case": test['case'],
                "status": "error",
                "error": str(e)
            })
            all_passed = False
    
    status = 'passed' if all_passed else 'failed'
    xp_earned = problem['xp_reward'] if all_passed else 0
    
    cursor.execute("""
        INSERT INTO submissions (user_id, problem_id, code, score, status, language)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (user_id, problem_id, code, total_score // len(test_cases), status, language))
    
    if all_passed:
        cursor.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (xp_earned, user_id))
    
    db.commit()
    
    new_badges = check_and_update_badges(user_id)
    
    db.close()
    
    return jsonify({
        "status": status,
        "score": total_score // len(test_cases),
        "results": results,
        "xp_earned": xp_earned,
        "badges_earned": new_badges
    }), 200

# ==================== SANDBOX MODE ENDPOINT ====================
@app.route('/api/sandbox/run', methods=['POST'])
@jwt_required()
def run_sandbox_code():
    user_id = get_jwt_identity()
    data = request.get_json()
    code = data.get('code')
    language = data.get('language', 'python') # Options: python, java, csharp
    input_data = data.get('input', '')
    
    if not code:
        return jsonify({"msg": "Code is required"}), 400

    # ✅ Determine file extension (Java, Python, C# ONLY)
    file_ext = '.py'
    if language == 'java': 
        file_ext = '.java'
    elif language == 'csharp': 
        file_ext = '.cs'
    # Removed C++ and JavaScript

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix=file_ext, delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        output = ""
        error = None
        
        if language == 'java':
            compile_proc = subprocess.run(['javac', temp_file], capture_output=True, text=True, timeout=10)
            if compile_proc.returncode != 0:
                raise Exception(f"Compilation Error:\n{compile_proc.stderr}")
            class_name = "Main"
            dir_path = os.path.dirname(temp_file)
            run_proc = subprocess.run(['java', '-cp', dir_path, class_name], 
                                      input=input_data, text=True, capture_output=True, timeout=5)
            output = run_proc.stdout
            if run_proc.returncode != 0:
                error = run_proc.stderr

        elif language == 'csharp':
            # ✅ NEW: C# Logic
            # 1. Compile C# using csc (C# Compiler)
            exe_name = temp_file.replace('.cs', '.exe')
            
            compile_proc = subprocess.run(['csc', f'/out:{exe_name}', temp_file], capture_output=True, text=True, timeout=10)
            if compile_proc.returncode != 0:
                raise Exception(f"Compilation Error:\n{compile_proc.stderr}")
            
            # 2. Run C# executable
            run_proc = subprocess.run([exe_name], 
                                      input=input_data, text=True, capture_output=True, timeout=5)
            output = run_proc.stdout
            if run_proc.returncode != 0:
                error = run_proc.stderr

        else:
            # Python (Default)
            exec_cmd = ['python']
            process = subprocess.run(
                exec_cmd + [temp_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=5
            )
            output = process.stdout
            if process.returncode != 0:
                error = process.stderr

        # Cleanup files
        if os.path.exists(temp_file): os.unlink(temp_file)
        
        # ✅ Cleanup C# executable
        if language == 'csharp' and 'exe_name' in locals() and os.path.exists(exe_name):
            os.unlink(exe_name)
        
        # Cleanup Java class files
        if language == 'java' and 'class_name' in locals() and os.path.exists(os.path.join(os.path.dirname(temp_file), f"{class_name}.class")):
            os.unlink(os.path.join(os.path.dirname(temp_file), f"{class_name}.class"))

        return jsonify({
            "success": True,
            "output": output,
            "error": error
        }), 200

    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": "⏱️ Code execution timed out (5s limit)"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200
    finally:
        try:
            if 'temp_file' in locals() and os.path.exists(temp_file): os.unlink(temp_file)
        except: pass

# ==================== STUDENT ANNOUNCEMENTS ENDPOINT ====================
@app.route('/api/student/announcements', methods=['GET'])
@jwt_required()
def student_get_announcements():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT block FROM users WHERE id = %s", (user_id,))
    student = cursor.fetchone()
    
    if not student:
        db.close()
        return jsonify({"msg": "User not found"}), 404
    
    student_block = student['block']
    
    # Fetch published announcements for the student's block, sorted by priority
    cursor.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        JOIN users u ON a.created_by = u.id
        WHERE a.block_number = %s 
        AND a.is_published = 1
        AND (a.scheduled_date IS NULL OR a.scheduled_date <= NOW())
        ORDER BY 
            CASE WHEN a.priority = 'high' THEN 0 
                 WHEN a.priority = 'medium' THEN 1 
                 ELSE 2 END,
            a.created_at DESC
        LIMIT 10
    """, (student_block,))
    
    announcements = cursor.fetchall()
    
    # Format timestamps for JSON response
    for ann in announcements:
        if ann['created_at']:
            ann['created_at'] = ann['created_at'].isoformat()
        if ann['scheduled_date']:
            ann['scheduled_date'] = ann['scheduled_date'].isoformat()
    
    db.close()
    
    return jsonify({"announcements": announcements}), 200

@app.route('/api/student/dashboard', methods=['GET'])
@jwt_required()
def get_student_dashboard():
    user_id = get_jwt_identity()
    
    if check_maintenance_mode(user_id):
        return jsonify({
            "msg": "System is under maintenance. Please try again later.",
            "maintenance_mode": True
        }), 503
    
    print(" DASHBOARD ENDPOINT HIT! ")
    
    try:
        print(f"🔍 Authenticated user_id: {user_id}")
        
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        
        cursor.execute("SELECT id, name, xp, level, streak, badges, block FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        print(f" User from DB: {user}")
        
        if not user:
            db.close()
            return jsonify({"msg": "User not found"}), 404
        
        user_xp = int(user.get('xp') or 0)
        user_level = int(user.get('level') or 1)
        user_streak = int(user.get('streak') or 0)
        user_block = user.get('block')
        xp_to_next = user_level * 250
        
        badges = check_and_update_badges(user_id)
        
        cursor.execute("""
            SELECT COUNT(DISTINCT problem_id) as count 
            FROM submissions 
            WHERE user_id = %s AND status = 'passed'
        """, (user_id,))
        completed_result = cursor.fetchone()
        completed_count = int(completed_result['count']) if completed_result and completed_result['count'] else 0
        
        cursor.execute("""
            SELECT AVG(score) as avg_score 
            FROM submissions 
            WHERE user_id = %s
        """, (user_id,))
        avg_result = cursor.fetchone()
        avg_score = int(avg_result['avg_score']) if avg_result and avg_result['avg_score'] else 0
        
        if user_block:
            cursor.execute("""
                SELECT p.id, p.title, p.difficulty, p.xp_reward,
                       (SELECT COUNT(*) FROM submissions WHERE problem_id = p.id AND user_id = %s) as attempts
                FROM problems p
                WHERE p.assigned_block = %s OR p.assigned_block IS NULL
                ORDER BY p.id DESC 
                LIMIT 3
            """, (user_id, user_block))
        else:
            cursor.execute("""
                SELECT p.id, p.title, p.difficulty, p.xp_reward,
                       (SELECT COUNT(*) FROM submissions WHERE problem_id = p.id AND user_id = %s) as attempts
                FROM problems p
                WHERE p.assigned_block IS NULL
                ORDER BY p.id DESC 
                LIMIT 3
            """, (user_id,))
        quests = cursor.fetchall()
        
        if user_block:
            cursor.execute("""
                SELECT id, title, difficulty, xp_reward 
                FROM problems 
                WHERE assigned_block = %s OR assigned_block IS NULL
                ORDER BY RAND() 
                LIMIT 3
            """, (user_block,))
        else:
            cursor.execute("""
                SELECT id, title, difficulty, xp_reward 
                FROM problems 
                WHERE assigned_block IS NULL
                ORDER BY RAND() 
                LIMIT 3
            """)
        recommended = cursor.fetchall()

        if user_block:
            cursor.execute("""
                SELECT id, title, difficulty, xp_reward 
                FROM problems 
                WHERE assigned_block = %s OR assigned_block IS NULL
                ORDER BY id DESC LIMIT 1
            """, (user_block,))
        else:
            cursor.execute("""
                SELECT id, title, difficulty, xp_reward 
                FROM problems 
                WHERE assigned_block IS NULL
                ORDER BY id DESC LIMIT 1
            """)
        daily = cursor.fetchone()

        cursor.execute("""
            SELECT s.score, s.status, s.submitted_at, p.title 
            FROM submissions s
            JOIN problems p ON s.problem_id = p.id
            WHERE s.user_id = %s
            ORDER BY s.submitted_at DESC
            LIMIT 5
        """, (user_id,))
        activity = cursor.fetchall()
        
        for act in activity:
            if act['submitted_at']:
                act['submitted_at'] = act['submitted_at'].isoformat()

        db.close()
        
        response = {
            "user": {
                "level": user_level,
                "xp": user_xp,
                "xp_to_next": xp_to_next,
                "streak": user_streak,
                "block": user_block
            },
            "stats": {
                "completed": completed_count,
                "total_xp": user_xp,
                "avg_score": avg_score,
                "streak": user_streak
            },
            "badges": badges,
            "quests": quests,
            "recommended": recommended,
            "daily": daily,
            "activity": activity
        }
        
        print(f"✅ Sending response: Level {user_level}, XP {user_xp}, Block {user_block}, Quests: {len(quests)}")
        return jsonify(response), 200
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"msg": str(e), "error": True}), 500

@app.route('/api/problems', methods=['POST'])
@jwt_required()
def create_problem():
    user_id = get_jwt_identity()
    
    if check_maintenance_mode(user_id):
        return jsonify({
            "msg": "System is under maintenance. Please try again later.",
            "maintenance_mode": True
        }), 503
    
    data = request.json
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    assigned_block = data.get('assigned_block', instructor['block'])
    
    cursor.execute("""
        INSERT INTO problems (title, description, difficulty, topic, starter_code, test_cases, xp_reward, assigned_block, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['title'], data['description'], data['difficulty'], 
        data.get('topic'), data.get('starter_code'), 
        json.dumps(data['test_cases']), data.get('xp_reward', 100),
        assigned_block, user_id
    ))
    db.commit()
    db.close()
    
    return jsonify({"msg": "Problem created", "id": cursor.lastrowid}), 201

# ==================== ADMIN ENDPOINTS ====================

@app.route('/api/admin/dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'")
    total_students = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'instructor'")
    total_instructors = cursor.fetchone()['count']
    
    # Count real blocks from the blocks table
    cursor.execute("SELECT COUNT(*) as count FROM blocks")
    total_blocks = cursor.fetchone()['count']
    
    cursor.execute("""
        SELECT u.name, u.role, al.action, al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
    """)
    recent_activity = cursor.fetchall()
    
    for act in recent_activity:
        if act['created_at']:
            act['created_at'] = act['created_at'].isoformat()
    
    db.close()
    
    return jsonify({
        "stats": {
            "total_students": total_students,
            "total_instructors": total_instructors,
            "total_blocks": total_blocks
        },
        "recent_activity": recent_activity
    }), 200

@app.route('/api/admin/activity', methods=['GET'])
@jwt_required()
def get_activity_logs():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    filter_type = request.args.get('filter', 'all')
    search_term = request.args.get('search', '')
    
    base_query = """
        SELECT 
            al.id,
            al.user_id,
            u.name,
            al.action,
            al.details,
            al.ip_address,
            al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
    """
    
    conditions = []
    params = []
    
    if filter_type != 'all':
        conditions.append("al.action LIKE %s")
        params.append(f"%{filter_type}%")
    
    if search_term:
        search_conditions = [
            "u.name LIKE %s",
            "al.action LIKE %s", 
            "al.details LIKE %s",
            "al.ip_address LIKE %s"
        ]
        search_param = f"%{search_term}%"
        conditions.append(f"({' OR '.join(search_conditions)})")
        params.extend([search_param] * 4)
    
    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)
    
    base_query += " ORDER BY al.created_at DESC"
    
    cursor.execute(base_query, params)
    logs = cursor.fetchall()
    
    for log in logs:
        if log['created_at']:
            log['created_at'] = log['created_at'].isoformat()
    
    db.close()
    
    return jsonify({"logs": logs}), 200

#        Get All Blocks (from REAL blocks table)
@app.route('/api/admin/blocks', methods=['GET'])
@jwt_required()
def admin_get_blocks():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get blocks from the REAL blocks table with user counts
    cursor.execute("""
        SELECT 
            b.id,
            b.block_number,
            b.course_name,
            b.description,
            b.created_at,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as student_count,
            COUNT(DISTINCT CASE WHEN u.role = 'instructor' THEN u.id END) as instructor_count
        FROM blocks b
        LEFT JOIN users u ON u.block = b.block_number
        GROUP BY b.id, b.block_number, b.course_name, b.description, b.created_at
        ORDER BY b.block_number
    """)
    blocks = cursor.fetchall()
    
    # Format timestamps
    for block in blocks:
        if block['created_at']:
            block['created_at'] = block['created_at'].isoformat()
    
    db.close()
    
    return jsonify({"blocks": blocks}), 200

#        Create Block (in REAL blocks table)
@app.route('/api/admin/blocks', methods=['POST'])
@jwt_required()
def admin_create_block():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    block_number = data.get('block_number')
    course_name = data.get('course_name', '')
    description = data.get('description', '')
    
    if not block_number:
        db.close()
        return jsonify({"msg": "Block number is required"}), 400
    
    # Check if block already exists in the REAL table
    cursor.execute("SELECT id FROM blocks WHERE block_number = %s", (block_number,))
    if cursor.fetchone():
        db.close()
        return jsonify({"msg": "Block already exists"}), 409
    
    # Insert into the REAL blocks table
    cursor.execute("""
        INSERT INTO blocks (block_number, course_name, description)
        VALUES (%s, %s, %s)
    """, (block_number, course_name, description))
    
    db.commit()
    block_id = cursor.lastrowid
    db.close()
    
    log_admin_activity(user_id, "CREATE_BLOCK", f"Created block: {block_number}")
    
    return jsonify({
        "msg": "Block created successfully",
        "id": block_id,
        "block_number": block_number
    }), 201

#                  Update Block 
@app.route('/api/admin/blocks/<int:block_id>', methods=['PUT'])
@jwt_required()
def admin_update_block(block_id):
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if block exists in REAL table
    cursor.execute("SELECT block_number FROM blocks WHERE id = %s", (block_id,))
    block = cursor.fetchone()
    
    if not block:
        db.close()
        return jsonify({"msg": "Block not found"}), 404
    
    # Build update query dynamically
    updates = []
    values = []
    
    if 'block_number' in data:
        # Check if new block number already exists (if changing)
        if data['block_number'] != block['block_number']:
            cursor.execute("SELECT id FROM blocks WHERE block_number = %s AND id != %s", 
                          (data['block_number'], block_id))
            if cursor.fetchone():
                db.close()
                return jsonify({"msg": "Block number already exists"}), 409
        updates.append("block_number = %s")
        values.append(data['block_number'])
    
    if 'course_name' in data:
        updates.append("course_name = %s")
        values.append(data['course_name'])
    
    if 'description' in data:
        updates.append("description = %s")
        values.append(data['description'])
    
    if not updates:
        db.close()
        return jsonify({"msg": "No updates provided"}), 400
    
    values.append(block_id)
    query = f"UPDATE blocks SET {', '.join(updates)} WHERE id = %s"
    
    cursor.execute(query, values)
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "UPDATE_BLOCK", f"Updated block ID: {block_id}")
    
    return jsonify({"msg": "Block updated successfully"}), 200

#          Delete Block (from REAL table)
@app.route('/api/admin/blocks/<int:block_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_block(block_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if block exists
    cursor.execute("SELECT block_number FROM blocks WHERE id = %s", (block_id,))
    block = cursor.fetchone()
    
    if not block:
        db.close()
        return jsonify({"msg": "Block not found"}), 404
    
    # Optional: Unassign users from this block before deleting
    cursor.execute("UPDATE users SET block = NULL WHERE block = %s", (block['block_number'],))
    
    # Delete the block from REAL table
    cursor.execute("DELETE FROM blocks WHERE id = %s", (block_id,))
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "DELETE_BLOCK", f"Deleted block: {block['block_number']}")
    
    return jsonify({"msg": "Block deleted successfully"}), 200

#           Bulk Delete Blocks (using REAL IDs)
@app.route('/api/admin/blocks/bulk-delete', methods=['POST'])
@jwt_required()
def admin_bulk_delete_blocks():
    user_id = get_jwt_identity()
    data = request.json
    block_ids = data.get('block_ids', [])  # Changed from block_numbers to block_ids
    
    if not block_ids:
        return jsonify({"msg": "No blocks specified"}), 400
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    try:
        # Get block numbers for logging and unassigning users
        placeholders = ','.join(['%s'] * len(block_ids))
        cursor.execute(f"SELECT block_number FROM blocks WHERE id IN ({placeholders})", block_ids)
        blocks = cursor.fetchall()
        block_numbers = [b['block_number'] for b in blocks]
        
        # Unassign users from these blocks
        if block_numbers:
            cursor.execute(f"""
                UPDATE users 
                SET block = NULL 
                WHERE block IN ({placeholders})
            """, block_numbers)
        
        # Delete the blocks from REAL table
        cursor.execute(f"DELETE FROM blocks WHERE id IN ({placeholders})", block_ids)
        
        db.commit()
        db.close()
        
        log_admin_activity(user_id, "BULK_DELETE_BLOCKS", 
                          f"Deleted {len(block_ids)} blocks: {', '.join(block_numbers)}")
        
        return jsonify({
            "msg": f"Successfully deleted {len(block_ids)} block(s)",
            "deleted_count": len(block_ids)
        }), 200
        
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({"msg": f"Error during bulk delete: {str(e)}"}), 500

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("""
        SELECT id, name, email, role, xp, level, block, created_at
        FROM users
        ORDER BY created_at DESC
    """)
    users = cursor.fetchall()
    
    for u in users:
        if u['created_at']:
            u['created_at'] = u['created_at'].isoformat()
    
    db.close()
    
    return jsonify({"users": users}), 200

@app.route('/api/admin/users', methods=['POST'])
@jwt_required()
def admin_create_user():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
    if cursor.fetchone():
        db.close()
        return jsonify({"msg": "Email already exists"}), 409
    
    block = data.get('block')
    
    cursor.execute("""
        INSERT INTO users (name, email, password, role, block, xp, level, streak, badges)
        VALUES (%s, %s, %s, %s, %s, 0, 1, 0, '{}')
    """, (data['name'], data['email'], data['password'], data['role'], block))
    
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "CREATE_USER", f"Created user: {data['email']}")
    
    return jsonify({"msg": "User created successfully", "id": cursor.lastrowid}), 201

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def admin_update_user(user_id):
    admin_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    updates = []
    values = []
    
    if 'name' in data:
        updates.append("name = %s")
        values.append(data['name'])
    if 'email' in data:
        updates.append("email = %s")
        values.append(data['email'])
    if 'password' in data and data['password']:
        updates.append("password = %s")
        values.append(data['password'])
    if 'role' in data:
        updates.append("role = %s")
        values.append(data['role'])
    if 'block' in data:
        updates.append("block = %s")
        values.append(data['block'])
    if 'xp' in data:
        updates.append("xp = %s")
        values.append(data['xp'])
    if 'level' in data:
        updates.append("level = %s")
        values.append(data['level'])
    
    if not updates:
        db.close()
        return jsonify({"msg": "No updates provided"}), 400
    
    values.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
    
    cursor.execute(query, values)
    db.commit()
    db.close()
    
    log_admin_activity(admin_id, "UPDATE_USER", f"Updated user ID: {user_id}")
    
    return jsonify({"msg": "User updated successfully"}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    admin_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
    admin = cursor.fetchone()
    
    if not admin or admin['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    db.commit()
    db.close()
    
    log_admin_activity(admin_id, "DELETE_USER", f"Deleted user ID: {user_id}")
    
    return jsonify({"msg": "User deleted successfully"}), 200

# ==================== SETTINGS ENDPOINTS ====================

@app.route('/api/admin/settings', methods=['GET'])
@jwt_required()
def get_admin_settings():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("SELECT * FROM system_settings")
    settings_rows = cursor.fetchall()
    db.close()
    
    settings = {}
    for row in settings_rows:
        if row['setting_value'] in ['true', 'false']:
            settings[row['setting_key']] = row['setting_value'] == 'true'
        elif row['setting_value'].isdigit():
            settings[row['setting_key']] = int(row['setting_value'])
        else:
            settings[row['setting_key']] = row['setting_value']
    
    return jsonify(settings), 200

@app.route('/api/admin/settings', methods=['PUT'])
@jwt_required()
def update_admin_settings():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    for key, value in data.items():
        if isinstance(value, bool):
            value = 'true' if value else 'false'
        
        cursor.execute("""
            INSERT INTO system_settings (setting_key, setting_value)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE setting_value = %s
        """, (key, value, value))
    
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "UPDATE_SETTINGS", f"Updated system settings: {', '.join(data.keys())}")
    
    return jsonify({"msg": "Settings updated successfully"}), 200

@app.route('/api/admin/settings/backup', methods=['POST'])
@jwt_required()
def backup_database():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("""
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ('last_backup', %s)
        ON DUPLICATE KEY UPDATE setting_value = %s
    """, (datetime.now().isoformat(), datetime.now().isoformat()))
    
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "BACKUP_DATABASE", "Created database backup")
    
    return jsonify({
        "msg": "Backup created successfully",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/api/admin/settings/clear-logs', methods=['POST'])
@jwt_required()
def clear_old_logs():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user['role'] != 'admin':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("""
        DELETE FROM activity_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    """)
    deleted_count = cursor.rowcount
    
    db.commit()
    db.close()
    
    log_admin_activity(user_id, "CLEAR_LOGS", f"Cleared {deleted_count} old activity logs")
    
    return jsonify({
        "msg": f"Cleared {deleted_count} old logs",
        "deleted_count": deleted_count
    }), 200

# ==================== INSTRUCTOR ENDPOINTS ====================

@app.route('/api/instructor/dashboard', methods=['GET'])
@jwt_required()
def instructor_dashboard():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    # Get stats
    cursor.execute("""
        SELECT COUNT(*) as student_count 
        FROM users 
        WHERE block = %s AND role = 'student'
    """, (instructor_block,))
    total_students = cursor.fetchone()['student_count']
    
    cursor.execute("""
        SELECT AVG(s.score) as avg_score
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE u.block = %s AND u.role = 'student'
    """, (instructor_block,))
    avg_result = cursor.fetchone()
    avg_score = int(avg_result['avg_score']) if avg_result['avg_score'] else 0
    
    cursor.execute("""
        SELECT COUNT(*) as pending_count
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE u.block = %s AND u.role = 'student' AND s.status = 'pending'
    """, (instructor_block,))
    pending_submissions = cursor.fetchone()['pending_count']
    
    cursor.execute("""
        SELECT COUNT(*) as problem_count
        FROM problems
        WHERE (assigned_block = %s OR assigned_block IS NULL)
        AND created_by = %s
    """, (instructor_block, user_id))
    total_problems = cursor.fetchone()['problem_count']
    
    # Get recent submissions
    cursor.execute("""
        SELECT u.name as student_name, p.title as problem_title, s.status, s.submitted_at
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        JOIN problems p ON s.problem_id = p.id
        WHERE u.block = %s AND u.role = 'student'
        ORDER BY s.submitted_at DESC
        LIMIT 5
    """, (instructor_block,))
    recent_submissions = cursor.fetchall()
    
    for sub in recent_submissions:
        if sub['submitted_at']:
            sub['submitted_at'] = sub['submitted_at'].isoformat()
    
    # Get assigned blocks (for instructors who might teach multiple)
    cursor.execute("""
        SELECT DISTINCT b.id, b.block_number, b.course_name, b.description,
               COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as student_count
        FROM blocks b
        LEFT JOIN users u ON u.block = b.block_number
        WHERE b.id IN (
            SELECT DISTINCT assigned_block 
            FROM problems 
            WHERE created_by = %s
        ) OR b.block_number = %s
        GROUP BY b.id, b.block_number, b.course_name, b.description
    """, (user_id, instructor_block))
    assigned_blocks = cursor.fetchall()
    
    db.close()
    
    return jsonify({
        "stats": {
            "total_students": total_students,
            "avg_score": avg_score,
            "pending_submissions": pending_submissions,
            "total_problems": total_problems
        },
        "recent_submissions": recent_submissions,
        "assigned_blocks": assigned_blocks
    }), 200

@app.route('/api/instructor/problems', methods=['GET'])
@jwt_required()
def instructor_get_problems():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    cursor.execute("""
        SELECT p.*, 
               COUNT(DISTINCT s.id) as submission_count,
               AVG(s.score) as avg_score
        FROM problems p
        LEFT JOIN submissions s ON p.id = s.problem_id
        WHERE p.created_by = %s AND (p.assigned_block = %s OR p.assigned_block IS NULL)
        GROUP BY p.id
        ORDER BY p.created_at DESC
    """, (user_id, instructor_block))
    problems = cursor.fetchall()
    
    for problem in problems:
        if problem['created_at']:
            problem['created_at'] = problem['created_at'].isoformat()
        if problem['test_cases']:
            try:
                problem['test_cases'] = json.loads(problem['test_cases'])
            except:
                problem['test_cases'] = []
    
    db.close()
    
    return jsonify({"problems": problems}), 200

@app.route('/api/instructor/problems', methods=['POST'])
@jwt_required()
def instructor_create_problem():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Use instructor's block as default if not specified
    assigned_block = data.get('assigned_block', instructor['block'])
    
    cursor.execute("""
        INSERT INTO problems (title, description, difficulty, topic, starter_code, test_cases, xp_reward, assigned_block, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['title'], data['description'], data['difficulty'], 
        data.get('topic'), data.get('starter_code', ''), 
        json.dumps(data['test_cases']), data.get('xp_reward', 100),
        assigned_block, user_id
    ))
    
    db.commit()
    problem_id = cursor.lastrowid
    db.close()
    
    return jsonify({"msg": "Problem created successfully", "id": problem_id}), 201

@app.route('/api/instructor/problems/<int:problem_id>', methods=['PUT'])
@jwt_required()
def instructor_update_problem(problem_id):
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if problem belongs to this instructor
    cursor.execute("SELECT created_by, assigned_block FROM problems WHERE id = %s", (problem_id,))
    problem = cursor.fetchone()
    
    if not problem or problem['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Problem not found or unauthorized"}), 404
    
    updates = []
    values = []
    
    if 'title' in data:
        updates.append("title = %s")
        values.append(data['title'])
    if 'description' in data:
        updates.append("description = %s")
        values.append(data['description'])
    if 'difficulty' in data:
        updates.append("difficulty = %s")
        values.append(data['difficulty'])
    if 'topic' in data:
        updates.append("topic = %s")
        values.append(data['topic'])
    if 'starter_code' in data:
        updates.append("starter_code = %s")
        values.append(data['starter_code'])
    if 'test_cases' in data:
        updates.append("test_cases = %s")
        values.append(json.dumps(data['test_cases']))
    if 'xp_reward' in data:
        updates.append("xp_reward = %s")
        values.append(data['xp_reward'])
    if 'assigned_block' in data:
        updates.append("assigned_block = %s")
        values.append(data['assigned_block'])
    
    if not updates:
        db.close()
        return jsonify({"msg": "No updates provided"}), 400
    
    values.append(problem_id)
    query = f"UPDATE problems SET {', '.join(updates)} WHERE id = %s"
    
    cursor.execute(query, values)
    db.commit()
    db.close()
    
    return jsonify({"msg": "Problem updated successfully"}), 200

@app.route('/api/instructor/problems/<int:problem_id>', methods=['DELETE'])
@jwt_required()
def instructor_delete_problem(problem_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if problem belongs to this instructor
    cursor.execute("SELECT created_by FROM problems WHERE id = %s", (problem_id,))
    problem = cursor.fetchone()
    
    if not problem or problem['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Problem not found or unauthorized"}), 404
    
    cursor.execute("DELETE FROM problems WHERE id = %s", (problem_id,))
    db.commit()
    db.close()
    
    return jsonify({"msg": "Problem deleted successfully"}), 200

@app.route('/api/instructor/courses', methods=['GET'])
@jwt_required()
def instructor_get_courses():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    # Get all blocks this instructor teaches (based on problems they created)
    cursor.execute("""
        SELECT DISTINCT b.id, b.block_number, b.course_name, b.description,
               COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as student_count,
               COUNT(DISTINCT p.id) as problem_count
        FROM blocks b
        LEFT JOIN users u ON u.block = b.block_number
        LEFT JOIN problems p ON p.assigned_block = b.block_number AND p.created_by = %s
        WHERE b.block_number = %s OR b.id IN (
            SELECT DISTINCT assigned_block 
            FROM problems 
            WHERE created_by = %s AND assigned_block IS NOT NULL
        )
        GROUP BY b.id, b.block_number, b.course_name, b.description
    """, (user_id, instructor_block, user_id))
    courses = cursor.fetchall()
    
    db.close()
    
    return jsonify({"courses": courses}), 200

@app.route('/api/instructor/courses/<block_number>', methods=['GET'])
@jwt_required()
def instructor_get_course_detail(block_number):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Get block details
    cursor.execute("""
        SELECT b.id, b.block_number, b.course_name, b.description,
               COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as student_count
        FROM blocks b
        LEFT JOIN users u ON u.block = b.block_number
        WHERE b.block_number = %s
        GROUP BY b.id, b.block_number, b.course_name, b.description
    """, (block_number,))
    course = cursor.fetchone()
    
    if not course:
        db.close()
        return jsonify({"msg": "Course not found"}), 404
    
    # Get students in this block
    cursor.execute("""
        SELECT id, name, email, xp, level, streak
        FROM users
        WHERE block = %s AND role = 'student'
        ORDER BY name
    """, (block_number,))
    students = cursor.fetchall()
    
    # Get problems for this block
    cursor.execute("""
        SELECT p.id, p.title, p.difficulty, p.xp_reward,
               COUNT(DISTINCT s.id) as submission_count,
               AVG(s.score) as avg_score
        FROM problems p
        LEFT JOIN submissions s ON p.id = s.problem_id
        WHERE (p.assigned_block = %s OR p.assigned_block IS NULL)
        AND p.created_by = %s
        GROUP BY p.id
        ORDER BY p.title
    """, (block_number, user_id))
    problems = cursor.fetchall()
    
    # Get recent activity in this block
    cursor.execute("""
        SELECT u.name as student_name, p.title as problem_title, s.score, s.status, s.submitted_at
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        JOIN problems p ON s.problem_id = p.id
        WHERE u.block = %s AND u.role = 'student'
        ORDER BY s.submitted_at DESC
        LIMIT 10
    """, (block_number,))
    recent_activity = cursor.fetchall()
    
    for act in recent_activity:
        if act['submitted_at']:
            act['submitted_at'] = act['submitted_at'].isoformat()
    
    db.close()
    
    return jsonify({
        "course": course,
        "students": students,
        "problems": problems,
        "recent_activity": recent_activity
    }), 200

# ==================== ENHANCED ANNOUNCEMENTS ENDPOINTS ====================

@app.route('/api/instructor/announcements', methods=['GET'])
@jwt_required()
def instructor_get_announcements():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    # Updated query to fetch new fields
    cursor.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        JOIN users u ON a.created_by = u.id
        WHERE a.block_number = %s
        ORDER BY 
            CASE WHEN a.scheduled_date IS NOT NULL AND a.scheduled_date > NOW() THEN 0 ELSE 1 END,
            a.created_at DESC
    """, (instructor_block,))
    announcements = cursor.fetchall()
    
    # Format timestamps and parse JSON fields if needed
    for ann in announcements:
        if ann['created_at']:
            ann['created_at'] = ann['created_at'].isoformat()
        if ann['scheduled_date']:
            ann['scheduled_date'] = ann['scheduled_date'].isoformat()
    
    db.close()
    
    return jsonify({"announcements": announcements}), 200

@app.route('/api/instructor/announcements', methods=['POST'])
@jwt_required()
def instructor_create_announcement():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Extract new fields
    title = data.get('title')
    content = data.get('content')
    ann_type = data.get('type', 'update')
    priority = data.get('priority', 'normal')
    target_audience = data.get('target_audience', 'all')
    selected_blocks = json.dumps(data.get('selected_blocks', [])) # Store as JSON
    selected_students = json.dumps(data.get('selected_students', [])) # Store as JSON
    scheduled_date = data.get('scheduled_date') # Could be None
    
    if not title or not content:
        db.close()
        return jsonify({"msg": "Title and content are required"}), 400
    
    cursor.execute("""
        INSERT INTO announcements (title, content, type, priority, target_audience, selected_blocks, selected_students, scheduled_date, block_number, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (title, content, ann_type, priority, target_audience, selected_blocks, selected_students, scheduled_date, instructor['block'], user_id))
    
    db.commit()
    announcement_id = cursor.lastrowid
    db.close()
    
    return jsonify({"msg": "Announcement created successfully", "id": announcement_id}), 201


@app.route('/api/instructor/announcements/<int:announcement_id>', methods=['PUT'])
@jwt_required()
def instructor_update_announcement(announcement_id):
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if announcement belongs to this instructor
    cursor.execute("SELECT created_by, block_number FROM announcements WHERE id = %s", (announcement_id,))
    announcement = cursor.fetchone()
    
    if not announcement or announcement['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Announcement not found or unauthorized"}), 404
    
    # Build dynamic update query
    updates = []
    values = []
    
    if 'title' in data:
        updates.append("title = %s")
        values.append(data['title'])
    if 'content' in data:
        updates.append("content = %s")
        values.append(data['content'])
    if 'type' in data:
        updates.append("type = %s")
        values.append(data['type'])
    if 'priority' in data:
        updates.append("priority = %s")
        values.append(data['priority'])
    if 'target_audience' in data:
        updates.append("target_audience = %s")
        values.append(data['target_audience'])
    if 'selected_blocks' in data:
        updates.append("selected_blocks = %s")
        values.append(json.dumps(data['selected_blocks']))
    if 'selected_students' in data:
        updates.append("selected_students = %s")
        values.append(json.dumps(data['selected_students']))
    if 'scheduled_date' in data:
        updates.append("scheduled_date = %s")
        values.append(data['scheduled_date'] if data['scheduled_date'] else None)
    
    if not updates:
        db.close()
        return jsonify({"msg": "No updates provided"}), 400
    
    values.append(announcement_id)
    query = f"UPDATE announcements SET {', '.join(updates)} WHERE id = %s"
    
    cursor.execute(query, values)
    db.commit()
    db.close()
    
    return jsonify({"msg": "Announcement updated successfully"}), 200

@app.route('/api/instructor/announcements/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
def instructor_delete_announcement(announcement_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check if announcement belongs to this instructor
    cursor.execute("SELECT created_by FROM announcements WHERE id = %s", (announcement_id,))
    announcement = cursor.fetchone()
    
    if not announcement or announcement['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Announcement not found or unauthorized"}), 404
    
    cursor.execute("DELETE FROM announcements WHERE id = %s", (announcement_id,))
    db.commit()
    db.close()
    
    return jsonify({"msg": "Announcement deleted successfully"}), 200

# ==================== LESSONS / COURSE MATERIALS ENDPOINTS ====================

@app.route('/api/instructor/lessons', methods=['GET'])
@jwt_required()
def instructor_get_lessons():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    cursor.execute("""
        SELECT l.*, u.name as author_name, p.title as linked_problem_title
        FROM lessons l
        JOIN users u ON l.created_by = u.id
        LEFT JOIN problems p ON l.linked_problem_id = p.id
        WHERE l.block_number = %s
        ORDER BY l.order_index ASC, l.created_at DESC
    """, (instructor_block,))
    lessons = cursor.fetchall()
    
    # Parse JSON fields
    for lesson in lessons:
        if lesson['resources']:
            try:
                lesson['resources'] = json.loads(lesson['resources'])
            except:
                lesson['resources'] = []
        if lesson['created_at']:
            lesson['created_at'] = lesson['created_at'].isoformat()
    
    db.close()
    return jsonify({"lessons": lessons}), 200

@app.route('/api/instructor/lessons', methods=['POST'])
@jwt_required()
def instructor_create_lesson():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    title = data.get('title')
    content = data.get('content', '')
    video_url = data.get('video_url', '')
    resources = json.dumps(data.get('resources', []))
    linked_problem_id = data.get('linked_problem_id')
    order_index = data.get('order_index', 0)
    is_published = data.get('is_published', False)
    
    # Generate a simple slug from title
    slug = title.lower().replace(' ', '-').replace("'", "")
    
    if not title:
        db.close()
        return jsonify({"msg": "Title is required"}), 400
    
    cursor.execute("""
        INSERT INTO lessons (title, slug, block_number, created_by, content, video_url, resources, linked_problem_id, order_index, is_published)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (title, slug, instructor['block'], user_id, content, video_url, resources, linked_problem_id, order_index, is_published))
    
    db.commit()
    lesson_id = cursor.lastrowid
    db.close()
    
    return jsonify({"msg": "Lesson created successfully", "id": lesson_id}), 201

@app.route('/api/instructor/lessons/<int:lesson_id>', methods=['PUT'])
@jwt_required()
def instructor_update_lesson(lesson_id):
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Check ownership
    cursor.execute("SELECT created_by FROM lessons WHERE id = %s", (lesson_id,))
    lesson = cursor.fetchone()
    
    if not lesson or lesson['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Lesson not found or unauthorized"}), 404
    
    updates = []
    values = []
    
    if 'title' in data:
        updates.append("title = %s")
        values.append(data['title'])
        # Update slug too if title changes
        slug = data['title'].lower().replace(' ', '-').replace("'", "")
        updates.append("slug = %s")
        values.append(slug)
        
    if 'content' in data:
        updates.append("content = %s")
        values.append(data['content'])
    if 'video_url' in data:
        updates.append("video_url = %s")
        values.append(data['video_url'])
    if 'resources' in data:
        updates.append("resources = %s")
        values.append(json.dumps(data['resources']))
    if 'linked_problem_id' in data:
        updates.append("linked_problem_id = %s")
        values.append(data['linked_problem_id'])
    if 'order_index' in data:
        updates.append("order_index = %s")
        values.append(data['order_index'])
    if 'is_published' in data:
        updates.append("is_published = %s")
        values.append(1 if data['is_published'] else 0)
    
    if not updates:
        db.close()
        return jsonify({"msg": "No updates provided"}), 400
    
    values.append(lesson_id)
    query = f"UPDATE lessons SET {', '.join(updates)} WHERE id = %s"
    
    cursor.execute(query, values)
    db.commit()
    db.close()
    
    return jsonify({"msg": "Lesson updated successfully"}), 200

@app.route('/api/instructor/lessons/<int:lesson_id>', methods=['DELETE'])
@jwt_required()
def instructor_delete_lesson(lesson_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("SELECT created_by FROM lessons WHERE id = %s", (lesson_id,))
    lesson = cursor.fetchone()
    
    if not lesson or lesson['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Lesson not found or unauthorized"}), 404
    
    cursor.execute("DELETE FROM lessons WHERE id = %s", (lesson_id,))
    db.commit()
    db.close()
    
    return jsonify({"msg": "Lesson deleted successfully"}), 200

# Student Endpoint: Get Lessons for their block
@app.route('/api/student/lessons', methods=['GET'])
@jwt_required()
def student_get_lessons():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT block FROM users WHERE id = %s", (user_id,))
    student = cursor.fetchone()
    
    if not student:
        db.close()
        return jsonify({"msg": "User not found"}), 404
    
    student_block = student['block']
    
    # Only show published lessons
    cursor.execute("""
        SELECT l.*, p.title as linked_problem_title, p.id as linked_problem_id
        FROM lessons l
        LEFT JOIN problems p ON l.linked_problem_id = p.id
        WHERE l.block_number = %s AND l.is_published = 1
        ORDER BY l.order_index ASC
    """, (student_block,))
    lessons = cursor.fetchall()
    
    for lesson in lessons:
        if lesson['resources']:
            try:
                lesson['resources'] = json.loads(lesson['resources'])
            except:
                lesson['resources'] = []
        if lesson['created_at']:
            lesson['created_at'] = lesson['created_at'].isoformat()
    
    db.close()
    return jsonify({"lessons": lessons}), 200

# ==================== GAMIFIED PROGRESS ENDPOINTS ====================

@app.route('/api/student/lessons/<int:lesson_id>/complete', methods=['POST'])
@jwt_required()
def complete_lesson():
    user_id = get_jwt_identity()
    lesson_id = request.json.get('lesson_id') # Or from URL
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Check if lesson exists and is published
    cursor.execute("SELECT * FROM lessons WHERE id = %s AND is_published = 1", (lesson_id,))
    lesson = cursor.fetchone()
    
    if not lesson:
        db.close()
        return jsonify({"msg": "Lesson not found or locked"}), 404
    
    # Check if already completed
    cursor.execute("SELECT id FROM student_progress WHERE user_id = %s AND lesson_id = %s", (user_id, lesson_id))
    if cursor.fetchone():
        db.close()
        return jsonify({"msg": "Already completed", "xp_earned": 0}), 200
    
    # Mark as complete & Award XP
    xp_reward = 50 # Base XP for reading
    cursor.execute("""
        INSERT INTO student_progress (user_id, lesson_id, is_completed, xp_earned, completed_at)
        VALUES (%s, %s, 1, %s, NOW())
    """, (user_id, lesson_id, xp_reward))
    
    # Update User Total XP
    cursor.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (xp_reward, user_id))
    
    db.commit()
    db.close()
    
    return jsonify({
        "msg": "Lesson completed!", 
        "xp_earned": xp_reward,
        "new_level": True # Simplified logic
    }), 200

@app.route('/api/student/progress', methods=['GET'])
@jwt_required()
def get_student_progress():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Get all completed lesson IDs for this user
    cursor.execute("SELECT lesson_id, xp_earned, completed_at FROM student_progress WHERE user_id = %s", (user_id,))
    progress = cursor.fetchall()
    
    # Format for frontend
    completed_ids = [p['lesson_id'] for p in progress]
    total_xp_from_lessons = sum(p['xp_earned'] for p in progress)
    
    db.close()
    
    return jsonify({
        "completed_lessons": completed_ids,
        "total_lesson_xp": total_xp_from_lessons
    }), 200

# ==================== FILE UPLOAD ENDPOINTS FOR LESSONS ====================

@app.route('/api/instructor/lessons/<int:lesson_id>/upload', methods=['POST'])
@jwt_required()
def upload_lesson_file(lesson_id):
    user_id = get_jwt_identity()
    
    # Check if instructor owns this lesson
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT created_by FROM lessons WHERE id = %s", (lesson_id,))
    lesson = cursor.fetchone()
    
    if not lesson or lesson['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    if 'file' not in request.files:
        db.close()
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        db.close()
        return jsonify({"msg": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # Create unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # Create upload directory if it doesn't exist
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], str(lesson_id))
        os.makedirs(upload_path, exist_ok=True)
        
        file_path = os.path.join(upload_path, unique_filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        file_type = filename.rsplit('.', 1)[1].lower()
        
        # Save to database
        cursor.execute("""
            INSERT INTO lesson_files (lesson_id, original_name, file_path, file_type, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (lesson_id, filename, file_path, file_type, file_size, user_id))
        
        db.commit()
        file_id = cursor.lastrowid
        db.close()
        
        return jsonify({
            "msg": "File uploaded successfully",
            "file_id": file_id,
            "original_name": filename,
            "file_size": file_size
        }), 201
    else:
        db.close()
        return jsonify({"msg": "File type not allowed"}), 400

@app.route('/api/instructor/lessons/<int:lesson_id>/files', methods=['GET'])
@jwt_required()
def get_lesson_files(lesson_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Check authorization
    cursor.execute("SELECT created_by FROM lessons WHERE id = %s", (lesson_id,))
    lesson = cursor.fetchone()
    
    if not lesson or lesson['created_by'] != user_id:
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("""
        SELECT id, original_name, file_path, file_type, file_size, created_at
        FROM lesson_files
        WHERE lesson_id = %s
        ORDER BY created_at DESC
    """, (lesson_id,))
    files = cursor.fetchall()
    
    db.close()
    
    return jsonify({"files": files}), 200

@app.route('/api/instructor/lessons/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_lesson_file(file_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Get file info and check ownership
    cursor.execute("""
        SELECT lf.*, l.created_by as lesson_creator
        FROM lesson_files lf
        JOIN lessons l ON lf.lesson_id = l.id
        WHERE lf.id = %s
    """, (file_id,))
    file = cursor.fetchone()
    
    if not file or file['lesson_creator'] != user_id:
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    # Delete file from filesystem
    try:
        if os.path.exists(file['file_path']):
            os.remove(file['file_path'])
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Delete from database
    cursor.execute("DELETE FROM lesson_files WHERE id = %s", (file_id,))
    db.commit()
    db.close()
    
    return jsonify({"msg": "File deleted successfully"}), 200

@app.route('/api/student/lessons/<int:lesson_id>/files', methods=['GET'])
@jwt_required()
def student_get_lesson_files(lesson_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Check if lesson is published and user has access
    cursor.execute("""
        SELECT l.block_number, u.block as user_block
        FROM lessons l
        JOIN users u ON u.id = %s
        WHERE l.id = %s AND l.is_published = 1
    """, (user_id, lesson_id))
    result = cursor.fetchone()
    
    if not result or result['block_number'] != result['user_block']:
        db.close()
        return jsonify({"msg": "Lesson not found or not accessible"}), 404
    
    cursor.execute("""
        SELECT id, original_name, file_type, file_size, created_at
        FROM lesson_files
        WHERE lesson_id = %s
        ORDER BY created_at DESC
    """, (lesson_id,))
    files = cursor.fetchall()
    
    db.close()
    
    return jsonify({"files": files}), 200

@app.route('/api/download/file/<int:file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Get file info
    cursor.execute("""
        SELECT lf.*, l.block_number, u.block as user_block, l.is_published
        FROM lesson_files lf
        JOIN lessons l ON lf.lesson_id = l.id
        JOIN users u ON u.id = %s
        WHERE lf.id = %s
    """, (user_id, file_id))
    file = cursor.fetchone()
    
    if not file:
        db.close()
        return jsonify({"msg": "File not found"}), 404
    
    # Check access (instructors can always access, students only if published and same block)
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if user['role'] != 'instructor':
        if file['block_number'] != file['user_block'] or not file['is_published']:
            db.close()
            return jsonify({"msg": "Access denied"}), 403
    
    db.close()
    
    if not os.path.exists(file['file_path']):
        return jsonify({"msg": "File not found on server"}), 404
    
    return send_file(file['file_path'], as_attachment=True, download_name=file['original_name'])

@app.route('/api/instructor/plagiarism/check', methods=['POST'])
@jwt_required()
def instructor_check_plagiarism():
    user_id = get_jwt_identity()
    data = request.json
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    submission_id = data.get('submission_id')
    if not submission_id:
        db.close()
        return jsonify({"msg": "Submission ID required"}), 400
    
    # Get the submission code
    cursor.execute("SELECT code, user_id, problem_id FROM submissions WHERE id = %s", (submission_id,))
    submission = cursor.fetchone()
    
    if not submission:
        db.close()
        return jsonify({"msg": "Submission not found"}), 404
    
    # Get all other submissions for the same problem in the same block
    cursor.execute("""
        SELECT s.id, s.code, s.user_id, u.name as student_name
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE s.problem_id = %s AND u.block = %s AND s.id != %s
    """, (submission['problem_id'], instructor['block'], submission_id))
    other_submissions = cursor.fetchall()
    
    db.close()
    
    # Simple plagiarism detection (you can enhance this with AI later)
    results = []
    target_code = submission['code']
    
    for other in other_submissions:
        similarity = calculate_code_similarity(target_code, other['code'])
        if similarity > 70:  # Threshold for flagging
            results.append({
                "submission_id": other['id'],
                "student_name": other['student_name'],
                "similarity_score": similarity,
                "flagged": True
            })
    
    return jsonify({
        "original_submission": submission_id,
        "plagiarism_results": results,
        "total_checked": len(other_submissions)
    }), 200

@app.route('/api/instructor/plagiarism/report', methods=['GET'])
@jwt_required()
def instructor_plagiarism_report():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    
    # Get all problems for this block
    cursor.execute("""
        SELECT p.id, p.title
        FROM problems p
        WHERE (p.assigned_block = %s OR p.assigned_block IS NULL)
        AND p.created_by = %s
    """, (instructor_block, user_id))
    problems = cursor.fetchall()
    
    plagiarism_report = []
    
    for problem in problems:
        # Get all submissions for this problem
        cursor.execute("""
            SELECT s.id, s.code, s.user_id, u.name as student_name, s.submitted_at
            FROM submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.problem_id = %s AND u.block = %s
            ORDER BY s.submitted_at
        """, (problem['id'], instructor_block))
        submissions = cursor.fetchall()
        
        if len(submissions) > 1:
            # Check each submission against others
            for i, sub1 in enumerate(submissions):
                for j, sub2 in enumerate(submissions):
                    if i < j:  # Avoid duplicate comparisons
                        similarity = calculate_code_similarity(sub1['code'], sub2['code'])
                        if similarity > 70:
                            plagiarism_report.append({
                                "problem_id": problem['id'],
                                "problem_title": problem['title'],
                                "student1": sub1['student_name'],
                                "student2": sub2['student_name'],
                                "similarity_score": similarity,
                                "submission1_id": sub1['id'],
                                "submission2_id": sub2['id']
                            })
    
    db.close()
    
    return jsonify({
        "plagiarism_cases": plagiarism_report,
        "total_cases": len(plagiarism_report)
    }), 200

@app.route('/api/instructor/analytics', methods=['GET'])
@jwt_required()
def instructor_analytics():
    user_id = get_jwt_identity()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT role, block FROM users WHERE id = %s", (user_id,))
    instructor = cursor.fetchone()
    
    if not instructor or instructor['role'] != 'instructor':
        db.close()
        return jsonify({"msg": "Unauthorized"}), 403
    
    instructor_block = instructor['block']
    selected_block = request.args.get('block', 'all')
    time_range = request.args.get('range', 'month')
    
    # Build query based on filters
    block_filter = "" if selected_block == 'all' else f"AND u.block = '{selected_block}'"
    
    # Get metrics
    cursor.execute(f"""
        SELECT 
            COUNT(DISTINCT u.id) as total_students,
            AVG(s.score) as class_average,
            COUNT(DISTINCT p.id) as active_problems
        FROM users u
        LEFT JOIN submissions s ON u.id = s.user_id
        LEFT JOIN problems p ON p.created_by = %s AND (p.assigned_block = %s OR p.assigned_block IS NULL)
        WHERE u.block = %s AND u.role = 'student' {block_filter}
    """, (user_id, instructor_block, instructor_block))
    metrics = cursor.fetchone()
    
    # Calculate completion rate (simplified)
    completion_rate = 85  # You would calculate this based on completed problems
    
    db.close()
    
    return jsonify({
        "metrics": {
            "totalStudents": metrics['total_students'] or 0,
            "classAverage": int(metrics['class_average']) if metrics['class_average'] else 0,
            "completionRate": completion_rate,
            "activeProblems": metrics['active_problems'] or 0
        },
        # Add other data structures as needed (mock data fallback in frontend)
        "performanceData": [],
        "topStudents": [],
        "strugglingStudents": [],
        "aiInsights": [],
        "challengingProblems": [],
        "heatmapData": []
    }), 200

# Helper function for code similarity
def calculate_code_similarity(code1, code2):
    """Calculate similarity between two code snippets (0-100%)"""
    if not code1 or not code2:
        return 0
    
    # Remove whitespace and comments for comparison
    def clean_code(code):
        lines = code.split('\n')
        cleaned = []
        for line in lines:
            # Remove comments
            if '#' in line:
                line = line[:line.index('#')]
            # Remove whitespace
            line = line.strip()
            if line:
                cleaned.append(line)
        return ' '.join(cleaned)
    
    clean1 = clean_code(code1)
    clean2 = clean_code(code2)
    
    if not clean1 or not clean2:
        return 0
    
    # Simple similarity calculation
    words1 = set(clean1.split())
    words2 = set(clean2.split())
    
    if not words1 or not words2:
        return 0
    
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    similarity = (intersection / union) * 100 if union > 0 else 0
    return round(similarity, 2)

if __name__ == '__main__':
    app.run(debug=True)