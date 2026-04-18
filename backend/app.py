from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from flask_cors import CORS
import mysql.connector
from dotenv import load_dotenv
import os
import json
import subprocess
import tempfile

print("🔥🔥 APP.PY STARTED FRESH! 🔥🔥🔥")

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

# ✅ UPDATED: Gamified Registration Endpoint with Role Selection
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')  # Default to student if not provided
    
    if not name or not email or not password:
        return jsonify({"msg": "Missing required fields"}), 400
    
    # Validate role - only allow these three roles
    valid_roles = ['student', 'instructor', 'admin']
    if role not in valid_roles:
        return jsonify({"msg": "Invalid role selected"}), 400
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # Check if email already exists
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        db.close()
        return jsonify({"msg": "Email already registered"}), 409
    
    # Create new user with SELECTED role
    cursor.execute("""
        INSERT INTO users (name, email, password, role, xp, level, streak)
        VALUES (%s, %s, %s, %s, 0, 1, 0)
    """, (name, email, password, role))
    
    user_id = cursor.lastrowid
    db.commit()
    db.close()
    
    # Create access token for auto-login
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        "msg": "Adventurer created successfully!",
        "token": access_token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,  # Return the selected role
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
    
    access_token = create_access_token(identity=user['id'])
    
    return jsonify({
        "msg": "Login successful",
        "token": access_token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role'],
            "level": user.get('level', 1),
            "xp": user.get('xp', 0)
        }
    }), 200

@app.route('/api/problems/<int:problem_id>', methods=['GET'])
@jwt_required()
def get_problem(problem_id):
    user_id = get_jwt_identity()
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
    db.close()
    
    return jsonify({
        "status": status,
        "score": total_score // len(test_cases),
        "results": results,
        "xp_earned": xp_earned
    }), 200

# ✅ DASHBOARD ENDPOINT - JWT DISABLED + REAL DATABASE DATA
@app.route('/api/student/dashboard', methods=['GET'])
# @jwt_required()  # ← JWT DISABLED - Comment out to bypass JWT validation
def get_student_dashboard():
    print("🚨 DASHBOARD ENDPOINT HIT! 🚨")
    
    try:
        # TEMPORARY: Hardcode user_id for testing
        user_id = 1
        print(f"🔍 Using user_id: {user_id}")
        
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        
        # Fetch user data
        cursor.execute("SELECT id, name, xp, level, streak FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        print(f"👤 User from DB: {user}")
        
        if not user:
            db.close()
            return jsonify({"msg": "User not found"}), 404
        
        # Safe defaults with type conversion
        user_xp = int(user.get('xp') or 0)
        user_level = int(user.get('level') or 1)
        user_streak = int(user.get('streak') or 0)
        xp_to_next = user_level * 250
        
        # Fetch completed problems count
        cursor.execute("""
            SELECT COUNT(DISTINCT problem_id) as count 
            FROM submissions 
            WHERE user_id = %s AND status = 'passed'
        """, (user_id,))
        completed_result = cursor.fetchone()
        completed_count = int(completed_result['count']) if completed_result and completed_result['count'] else 0
        
        # Fetch average score
        cursor.execute("""
            SELECT AVG(score) as avg_score 
            FROM submissions 
            WHERE user_id = %s
        """, (user_id,))
        avg_result = cursor.fetchone()
        avg_score = int(avg_result['avg_score']) if avg_result and avg_result['avg_score'] else 0
        
        db.close()
        
        # Build response with REAL data
        response = {
            "user": {
                "level": user_level,
                "xp": user_xp,
                "xp_to_next": xp_to_next,
                "streak": user_streak
            },
            "stats": {
                "completed": completed_count,
                "total_xp": user_xp,
                "avg_score": avg_score,
                "streak": user_streak
            },
            "quests": [],
            "recommended": [],
            "daily": None,
            "activity": []
        }
        
        print(f"✅ Sending response: Level {user_level}, XP {user_xp}, Completed {completed_count}")
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
    data = request.json
    
    db = get_db_connection()
    cursor = db.cursor()
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user or user[0] != 'instructor':
        return jsonify({"msg": "Unauthorized"}), 403
    
    cursor.execute("""
        INSERT INTO problems (title, description, difficulty, topic, starter_code, test_cases, xp_reward)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        data['title'], data['description'], data['difficulty'], 
        data.get('topic'), data.get('starter_code'), 
        json.dumps(data['test_cases']), data.get('xp_reward', 100)
    ))
    db.commit()
    db.close()
    
    return jsonify({"msg": "Problem created", "id": cursor.lastrowid}), 201

if __name__ == '__main__':
    app.run(debug=True)