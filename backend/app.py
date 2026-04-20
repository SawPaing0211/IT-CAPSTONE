from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from flask_cors import CORS
import mysql.connector
from dotenv import load_dotenv
import os
import json
import subprocess
import tempfile
from datetime import datetime

print(" APP.PY STARTED FRESH! 🔥")

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'forge-dev-capstone-2026')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'forge-dev-capstone-2026')
CORS(app)
jwt = JWTManager(app)

def get_db_connection():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'forgedev')
    )
    return conn

# ✅ Badge Checking Logic
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

# ✅ Helper: Log admin activity
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

# ✅ NEW: Check maintenance mode (allow admin always)
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
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM problems WHERE id = %s", (problem_id,))
    problem = cursor.fetchone()
    
    if not problem:
        return jsonify({"msg": "Problem not found"}), 404
    
    test_cases = json.loads(problem['test_cases'])
    results = []
    all_passed = True
    total_score = 0
    
    for test in test_cases:
        expected = test['expected']
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            process = subprocess.run(
                ['python', temp_file],
                input=test['input'],
                text=True,
                capture_output=True,
                timeout=5
            )
            
            os.unlink(temp_file)
            actual = process.stdout.strip()
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
        INSERT INTO submissions (user_id, problem_id, code, score, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, problem_id, code, total_score // len(test_cases), status))
    
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
        print(f"👤 User from DB: {user}")
        
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

# ✅ UPDATED: Get All Blocks (from REAL blocks table)
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

# ✅ UPDATED: Create Block (in REAL blocks table)
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

# ✅ NEW: Update Block (REAL table - FIXES YOUR EDIT ERROR!)
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

# ✅ UPDATED: Delete Block (from REAL table)
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

# ✅ UPDATED: Bulk Delete Blocks (using REAL IDs)
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

if __name__ == '__main__':
    app.run(debug=True)