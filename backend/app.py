from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import subprocess, sys, time, csv
from io import StringIO
from sqlalchemy import text, inspect

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/forge_dev'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, origins=["http://localhost:5173"], supports_credentials=True)
jwt = JWTManager(app)
db = SQLAlchemy(app)

# ===== RATE LIMITING =====
rate_limit_store = {}
def rate_limit(max_calls=5, period=60):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            now = time.time()
            if ip not in rate_limit_store: rate_limit_store[ip] = []
            rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < period]
            if len(rate_limit_store[ip]) >= max_calls:
                return jsonify({"error": "Rate limit exceeded. Try again later."}), 429
            rate_limit_store[ip].append(now)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ===== MODELS =====
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('student', 'instructor', 'admin'), default='student')
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Problem(db.Model):
    __tablename__ = 'problems'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Enum('Easy', 'Medium', 'Hard'), nullable=False)
    category = db.Column(db.String(100))
    test_cases = db.Column(db.JSON, nullable=False)
    starter_code = db.Column(db.JSON)
    xp_reward = db.Column(db.Integer, nullable=False)
    is_published = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ===== NEW PRO FIELDS (Phase 1) =====
    problem_type = db.Column(db.Enum('coding', 'debugging'), default='coding')
    languages = db.Column(db.JSON, default=['python'])  # ['python', 'java', 'csharp']
    is_event_quest = db.Column(db.Boolean, default=False)
    visible_to_blocks = db.Column(db.JSON, default=[])  # [block_id1, block_id2]
    hints = db.Column(db.JSON, default=[])  # [{text: "...", xp_penalty: 10}]
    tags = db.Column(db.JSON, default=[])
    prerequisites = db.Column(db.JSON, default=[])
    estimated_time = db.Column(db.String(50))
    partial_credit = db.Column(db.Integer, default=100)
    auto_grade = db.Column(db.Boolean, default=True)
    plagiarism_threshold = db.Column(db.Float, default=0.85)

class Submission(db.Model):
    __tablename__ = 'submissions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    problem_id = db.Column(db.Integer, db.ForeignKey('problems.id'), nullable=False)
    code = db.Column(db.Text, nullable=False)
    language = db.Column(db.Enum('python', 'java', 'csharp'), nullable=False)
    status = db.Column(db.Enum('accepted', 'wrong_answer', 'timeout', 'error'), nullable=False)
    score = db.Column(db.Integer, default=0)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

class Announcement(db.Model):
    __tablename__ = 'announcements'
    id = db.Column(db.Integer, primary_key=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) 
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Class(db.Model):
    __tablename__ = 'classes'
    id = db.Column(db.Integer, primary_key=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    section_code = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    target_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PlagiarismReport(db.Model):
    __tablename__ = 'plagiarism_reports'
    id = db.Column(db.Integer, primary_key=True)
    submission_a_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False)
    submission_b_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False)
    similarity_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.Enum('pending', 'reviewed', 'resolved', 'dismissed'), default='pending')
    admin_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class_students = db.Table('class_students',
    db.Column('class_id', db.Integer, db.ForeignKey('classes.id'), primary_key=True),
    db.Column('student_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)
class_problems = db.Table('class_problems',
    db.Column('class_id', db.Integer, db.ForeignKey('classes.id'), primary_key=True),
    db.Column('problem_id', db.Integer, db.ForeignKey('problems.id'), primary_key=True)
)

# ===== HELPERS =====
def is_instructor_or_admin(user): return user and user.role in ['instructor', 'admin']
def is_admin(user): return user and user.role == 'admin'

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not is_admin(user):
            return jsonify({"error": "Admin access required"}), 403
        return f(user, *args, **kwargs)
    return decorated

def log_admin_action(admin_id, action, details=None, target_id=None):
    log = AuditLog(admin_id=admin_id, action=action, details=details or "", target_id=target_id, ip_address=request.remote_addr)
    db.session.add(log); db.session.flush()

def sanitize_code(code, language):
    if language == 'python':
        dangerous = ['__import__', 'os.system', 'subprocess', 'eval(', 'exec(', 'open(', 'import os', 'import sys']
        return not any(p in code for p in dangerous)
    return True

def evaluate_code(code, test_cases, language):
    if language != 'python':
        return [{"test_case": tc.get('input','')[:50], "expected": tc.get('expected','')[:50], 
                 "passed": False, "output": f"{language.upper()} sandbox pending", "runtime": "0.00s"} for tc in test_cases]
    if not sanitize_code(code, language):
        return [{"test_case": "N/A", "expected": "N/A", "passed": False, "output": "Security Error: Disallowed operation", "runtime": "0.00s"}]
    
    results = []
    for tc in test_cases:
        try:
            start = time.time()
            proc = subprocess.run([sys.executable, '-c', code], input=tc.get('input',''), capture_output=True, text=True, timeout=5, cwd='/', env={'PATH': '/usr/bin:/bin'})
            elapsed = time.time() - start
            actual = proc.stdout.strip()
            passed = actual == tc.get('expected','').strip() and proc.returncode == 0
            results.append({"test_case": tc.get('input','')[:50], "expected": tc.get('expected','')[:50], 
                            "passed": passed, "output": actual[:100] if not passed else tc.get('expected','')[:50], 
                            "runtime": f"{elapsed:.2f}s", "message": "Passed" if passed else f"Exit {proc.returncode}: {proc.stderr.strip()[:80]}"})
        except subprocess.TimeoutExpired:
            results.append({"test_case": tc.get('input','')[:50], "expected": tc.get('expected','')[:50], 
                            "passed": False, "output": "Timeout: >5s", "runtime": "5.00s", "message": "Execution timeout"})
        except Exception as e:
            results.append({"test_case": tc.get('input','')[:50], "expected": tc.get('expected','')[:50], 
                            "passed": False, "output": str(e)[:100], "runtime": "0.00s", "message": "System error"})
    return results

# ===== AUTH ROUTES =====
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not all(k in data for k in ['username','email','password']): return jsonify({"error": "Missing fields"}), 400
    if User.query.filter_by(username=data['username']).first() or User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Username or email exists"}), 400
    new_user = User(username=data['username'], email=data['email'], password_hash=generate_password_hash(data['password']), role=data.get('role','student'))
    db.session.add(new_user); db.session.commit()
    return jsonify({"message": "Created", "access_token": create_access_token(identity=str(new_user.id)), "user": {"id":new_user.id, "username":new_user.username, "role":new_user.role}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('username') or not data.get('password'): return jsonify({"error": "Missing credentials"}), 400
    user = User.query.filter_by(username=data['username']).first()
    if not user or not check_password_hash(user.password_hash, data['password']): return jsonify({"error": "Invalid credentials"}), 401
    if not user.is_active: return jsonify({"error": "Account disabled"}), 403
    return jsonify({"message": "Login successful", "access_token": create_access_token(identity=str(user.id)), "user": {"id":user.id, "username":user.username, "role":user.role, "xp":user.xp, "level":user.level}}), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "Not found"}), 404
    return jsonify({"id":user.id, "username":user.username, "role":user.role, "xp":user.xp, "level":user.level}), 200

# ===== PROBLEM & SUBMISSION ROUTES =====
@app.route('/api/problems', methods=['POST'])
@jwt_required()
def create_problem():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    # Basic Validation
    if not all(k in data for k in ['title','description','difficulty','xp_reward','test_cases']): 
        return jsonify({"error": "Missing required fields"}), 400
    
    if data['difficulty'] not in ['Easy','Medium','Hard']: 
        return jsonify({"error": "Invalid difficulty"}), 400
        
    if not isinstance(data['test_cases'], list) or len(data['test_cases']) == 0: 
        return jsonify({"error": "At least one test case required"}), 400
    
    for i, tc in enumerate(data['test_cases']):
        if 'input' not in tc or 'expected' not in tc: 
            return jsonify({"error": f"Test case {i+1} invalid"}), 400

    # Create Problem Object with NEW PRO FIELDS
    p = Problem(
        title=data['title'], 
        description=data['description'], 
        category=data.get('category','General'), 
        difficulty=data['difficulty'], 
        xp_reward=data['xp_reward'], 
        test_cases=data['test_cases'], 
        starter_code=data.get('starter_code', ''), 
        is_published=data.get('is_published', False), 
        created_by=user.id,
        # NEW FIELDS
        problem_type=data.get('problem_type', 'coding'),
        languages=data.get('languages', ['python']),
        is_event_quest=data.get('is_event_quest', False),
        visible_to_blocks=data.get('visible_to_blocks', []),
        hints=data.get('hints', []),
        tags=data.get('tags', []),
        prerequisites=data.get('prerequisites', []),
        estimated_time=data.get('estimated_time'),
        partial_credit=data.get('partial_credit', 100),
        auto_grade=data.get('auto_grade', True),
        plagiarism_threshold=data.get('plagiarism_threshold', 0.85)
    )
    
    db.session.add(p)
    db.session.commit()
    return jsonify({"message": "Problem created", "problem_id": p.id}), 201

@app.route('/api/problems', methods=['GET'])
def get_problems():
    """Get published problems with filtering for block visibility & problem type"""
    block_id = request.args.get('block_id', type=int)
    problem_type = request.args.get('type')  # 'coding' or 'debugging'
    
    query = Problem.query.filter_by(is_published=True)
    
    # Filter by problem type if specified
    if problem_type:
        query = query.filter_by(problem_type=problem_type)
    
    problems = query.all()
    filtered_problems = []
    
    for p in problems:
        # Block visibility logic:
        # If visible_to_blocks is empty/null -> visible to ALL
        # If block_id provided -> only show if block_id is in visible_to_blocks
        if not p.visible_to_blocks or (block_id and block_id in p.visible_to_blocks):
            filtered_problems.append(p)
        elif not block_id:
            filtered_problems.append(p)
    
    result = []
    for p in filtered_problems:
        result.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty,
            "xp_reward": p.xp_reward,
            "problem_type": p.problem_type,
            "is_event_quest": p.is_event_quest,
            "languages": p.languages or ['python'],
            "hints": p.hints or [],
            "tags": p.tags or [],
            "starter_code": p.starter_code,
            "test_cases": p.test_cases,
            "estimated_time": p.estimated_time,
            "partial_credit": p.partial_credit,
            "auto_grade": p.auto_grade,
            "created_at": p.created_at.isoformat()
        })
    
    return jsonify(result), 200

@app.route('/api/submissions', methods=['POST'])
@jwt_required()
def create_submission():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student': return jsonify({"error": "Students only"}), 403
    data = request.get_json()
    if not all(k in data for k in ['problem_id','code','language']): return jsonify({"error": "Missing fields"}), 400
    prob = Problem.query.get_or_404(data['problem_id'])
    if not prob.is_published: return jsonify({"error": "Problem unavailable"}), 404
    sub = Submission(user_id=user.id, problem_id=prob.id, code=data['code'], language=data['language'], status='evaluating', score=0)
    db.session.add(sub); db.session.flush()
    try:
        results = evaluate_code(data['code'], prob.test_cases, data['language'])
        passed = sum(1 for r in results if r['passed'])
        total = len(results)
        if passed == total and total > 0:
            sub.status, sub.score = 'accepted', prob.xp_reward
            user.xp += prob.xp_reward; user.level = 1 + (user.xp // 100)
        else:
            sub.status, sub.score = 'wrong_answer', int((passed/total)*(prob.xp_reward*0.3)) if total > 0 else 0
            if sub.score > 0: user.xp += sub.score; user.level = 1 + (user.xp // 100)
        db.session.commit()
        return jsonify({"submission_id":sub.id, "status":sub.status, "score":sub.score, "test_results":results, "user_xp":user.xp, "user_level":user.level}), 201
    except Exception as e:
        db.session.rollback(); sub.status = 'error'; db.session.commit()
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/submissions', methods=['GET'])
@jwt_required()
def get_student_submissions():
    user_id = int(get_jwt_identity())
    page, limit = request.args.get('page',1,type=int), min(request.args.get('limit',15,type=int),50)
    total = Submission.query.filter_by(user_id=user_id).count()
    subs = Submission.query.filter_by(user_id=user_id).order_by(Submission.submitted_at.desc()).limit(limit).offset((page-1)*limit).all()
    return jsonify({"submissions":[{"id":s.id, "problem_id":s.problem_id, "problem_title":Problem.query.get(s.problem_id).title if Problem.query.get(s.problem_id) else "Unknown", "status":s.status, "score":s.score, "language":s.language, "submitted_at":s.submitted_at.isoformat()} for s in subs], "total":total, "page":page, "pages":max(1,(total+limit-1)//limit)}), 200

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    class_id = request.args.get('class_id')
    if class_id:
        class_obj = Class.query.get_or_404(class_id)
        students = User.query.filter(User.id.in_([s.id for s in class_obj.students]), User.role=='student').order_by(User.xp.desc()).limit(20).all()
    else:
        students = User.query.filter_by(role='student').order_by(User.xp.desc()).limit(20).all()
    return jsonify([{"rank":i+1, "username":s.username, "xp":s.xp, "level":s.level} for i,s in enumerate(students)]), 200

@app.route('/api/student/stats', methods=['GET'])
@jwt_required()
def get_student_stats():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student': return jsonify({"error": "Students only"}), 403
    subs = Submission.query.filter_by(user_id=user.id).all()
    accepted = len([s for s in subs if s.status=='accepted'])
    return jsonify({"total_xp":user.xp, "level":user.level, "total_submissions":len(subs), "accepted_submissions":accepted, "success_rate":round((accepted/len(subs)*100),1) if subs else 0.0, "last_submission":subs[0].submitted_at.isoformat() if subs else None}), 200

# ===== INSTRUCTOR ROUTES =====
@app.route('/api/instructor/problems', methods=['GET'])
@jwt_required()
def get_instructor_problems():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    
    problems = Problem.query.filter_by(created_by=user.id).all()
    return jsonify([{
        "id": p.id, 
        "title": p.title, 
        "difficulty": p.difficulty, 
        "is_published": p.is_published, 
        "xp_reward": p.xp_reward,
        "problem_type": p.problem_type,
        "is_event_quest": p.is_event_quest,
        "languages": p.languages or ['python'],
        "tags": p.tags or [],
        "visible_to_blocks": p.visible_to_blocks or [],
        "created_at": p.created_at.isoformat()
    } for p in problems]), 200

@app.route('/api/instructor/problems/<int:problem_id>', methods=['GET'])
@jwt_required()
def get_instructor_problem_detail(problem_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    
    problem = Problem.query.get_or_404(problem_id)
    if problem.created_by != user_id and user.role != 'admin':
        return jsonify({"error": "Not your problem"}), 403
        
    return jsonify({
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "category": problem.category,
        "xp_reward": problem.xp_reward,
        "test_cases": problem.test_cases,
        "starter_code": problem.starter_code,
        "is_published": problem.is_published,
        "problem_type": problem.problem_type,
        "languages": problem.languages,
        "is_event_quest": problem.is_event_quest,
        "visible_to_blocks": problem.visible_to_blocks,
        "hints": problem.hints,
        "tags": problem.tags,
        "prerequisites": problem.prerequisites,
        "estimated_time": problem.estimated_time,
        "partial_credit": problem.partial_credit,
        "auto_grade": problem.auto_grade,
        "plagiarism_threshold": problem.plagiarism_threshold
    }), 200

@app.route('/api/instructor/classes', methods=['GET'])
@jwt_required()
def get_instructor_classes():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    return jsonify([{"id":c.id, "name":c.name, "section_code":c.section_code, "semester":c.semester, "student_count":0} for c in Class.query.filter_by(instructor_id=user.id).all()]), 200

@app.route('/api/classes', methods=['POST'])
@jwt_required()
def create_class():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    if not data.get('name') or not data.get('section_code'): return jsonify({"error": "Name & section code required"}), 400
    if Class.query.filter_by(instructor_id=user.id, section_code=data['section_code']).first(): return jsonify({"error": "Section exists"}), 400
    c = Class(instructor_id=user.id, name=data['name'], section_code=data['section_code'], semester=data.get('semester',''))
    db.session.add(c); db.session.commit()
    return jsonify({"message": "Class created", "class_id":c.id}), 201

@app.route('/api/instructor/class/<int:class_id>/stats', methods=['GET'])
@jwt_required()
def get_class_stats(class_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    c = Class.query.get_or_404(class_id)
    if c.instructor_id != user.id and user.role != 'admin': return jsonify({"error": "Not your class"}), 403
    student_ids = [cs.student_id for cs in db.session.query(class_students.c.student_id).filter_by(class_id=class_id).all()]
    problem_ids = [cp.problem_id for cp in db.session.query(class_problems.c.problem_id).filter_by(class_id=class_id).all()]
    subs = Submission.query.filter(Submission.user_id.in_(student_ids) if student_ids else False, Submission.problem_id.in_(problem_ids) if problem_ids else False).all() if student_ids and problem_ids else []
    accepted = len([s for s in subs if s.status=='accepted'])
    total = len(subs)
    avg = round((accepted/total*100),1) if total > 0 else 0.0
    recent = [{"student":User.query.get(s.user_id).username, "problem":Problem.query.get(s.problem_id).title, "status":s.status, "xp":s.score, "submitted_at":s.submitted_at.isoformat()} for s in subs[-5:]]
    return jsonify({"total_problems":len(problem_ids), "total_students":len(student_ids), "avg_completion":avg, "total_xp_awarded":sum(s.score for s in subs), "recent_submissions":recent}), 200

@app.route('/api/announcements', methods=['POST'])
@jwt_required()
def create_announcement():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    if not data.get('title') or not data.get('content'): return jsonify({"error": "Title & content required"}), 400
    a = Announcement(instructor_id=user.id, class_id=data.get('class_id'), title=data['title'], content=data['content'], is_pinned=data.get('is_pinned',False))
    db.session.add(a); db.session.commit()
    return jsonify({"message": "Announcement created", "announcement_id":a.id}), 201

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    class_id = request.args.get('class_id')
    q = Announcement.query.filter_by(class_id=class_id) if class_id else Announcement.query.filter(Announcement.class_id==None)
    return jsonify([{"id":a.id, "title":a.title, "content":a.content, "is_pinned":a.is_pinned, "created_at":a.created_at.isoformat(), "instructor":User.query.get(a.instructor_id).username if a.instructor_id else "System"} for a in q.order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc()).all()]), 200

# ===== ADMIN ROUTES (SYSTEM-ONLY) =====
@app.route('/api/admin/overview', methods=['GET'])
@admin_required
def admin_overview(admin):
    total_users = User.query.count()
    active_students = User.query.filter_by(role='student', is_active=True).count()
    active_instructors = User.query.filter_by(role='instructor', is_active=True).count()
    total_submissions = Submission.query.count()
    today_subs = Submission.query.filter(Submission.submitted_at >= datetime.utcnow() - timedelta(days=1)).count()
    config = {c.key:c.value for c in SystemConfig.query.all()}
    return jsonify({
        "total_users": total_users, "active_students": active_students, "active_instructors": active_instructors,
        "total_submissions": total_submissions, "today_submissions": today_subs,
        "maintenance_mode": config.get('maintenance_mode', 'false') == 'true',
        "server_time": datetime.utcnow().isoformat()
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users(admin):
    """Get users with proper block info based on role"""
    role = request.args.get('role')
    search = request.args.get('search', '').lower()
    status = request.args.get('status')
    
    q = User.query
    if role and role != 'all': q = q.filter_by(role=role)
    if status == 'active': q = q.filter_by(is_active=True)
    elif status == 'inactive': q = q.filter_by(is_active=False)
    if search: q = q.filter((User.username.ilike(f'%{search}%')) | (User.email.ilike(f'%{search}%')))
    
    users = q.order_by(User.created_at.desc()).limit(50).all()
    
    result = []
    for u in users:
        block_id = None
        block_name = None
        
        # ✅ FIX: Get Block info based on Role
        if u.role == 'student':
            # Students are in class_students table
            assignment = db.session.query(class_students.c.class_id).filter_by(student_id=u.id).first()
            if assignment:
                cls = Class.query.get(assignment.class_id)
                if cls:
                    block_id = cls.id
                    block_name = cls.name
                    
        elif u.role == 'instructor':
            # Instructors are in classes.instructor_id
            cls = Class.query.filter_by(instructor_id=u.id).first()
            if cls:
                block_id = cls.id
                block_name = cls.name
        
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "xp": u.xp,
            "level": u.level,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "block_id": block_id,      # ✅ Needed for dropdown selection
            "block_name": block_name   # ✅ Needed for display
        })
        
    return jsonify(result), 200

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def admin_update_user(admin, user_id):
    """Update user with proper block assignment logic"""
    target = User.query.get_or_404(user_id)
    if target.id == admin.id: return jsonify({"error": "Cannot modify own account"}), 400
    data = request.get_json()
    changes = []
    
    if 'role' in data and data['role'] in ['student','instructor','admin']:
        if target.role != data['role']: changes.append(f"Role: {target.role} -> {data['role']}")
        target.role = data['role']
        
    if 'is_active' in data:
        if target.is_active != data['is_active']: 
            changes.append(f"Status: {'Active' if target.is_active else 'Inactive'} -> {'Active' if data['is_active'] else 'Inactive'}")
        target.is_active = data['is_active']
        
    if 'xp' in data:
        target.xp = int(data['xp'])
        
    if 'level' in data:
        target.level = int(data['level'])
    
    # ✅ FIX: Handle Block Assignment & Unassignment
    if 'block_id' in data:
        block_id = data['block_id'] # Can be ID or null/empty
        
        if target.role == 'student':
            # Remove existing assignment
            db.session.query(class_students).filter_by(student_id=user_id).delete()
            
            if block_id: # Assign to new block
                db.session.execute(class_students.insert().values(class_id=block_id, student_id=user_id))
                changes.append(f"Assigned to Block {block_id}")
            else:
                changes.append("Unassigned from block")
                
        elif target.role == 'instructor':
            # Instructors are assigned via the classes table
            if block_id:
                # Assign instructor to this block (remove from old ones first)
                Class.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
                Class.query.filter_by(id=block_id).update({'instructor_id': user_id})
                changes.append(f"Assigned as Instructor to Block {block_id}")
            else:
                # Unassign instructor
                Class.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
                changes.append("Unassigned as instructor")
        
    db.session.commit()
    log_admin_action(admin.id, "USER_UPDATED", f"Target: {target.username}. Changes: {', '.join(changes) if changes else 'None'}", target_id=user_id)
    return jsonify({"message": "User updated", "changes": changes}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(admin, user_id):
    """Delete User and Clean up Relations"""
    if user_id == admin.id: return jsonify({"error": "Cannot delete own account"}), 400
    target = User.query.get_or_404(user_id)
    
    # Cleanup student assignments
    db.session.query(class_students).filter_by(student_id=user_id).delete()
    
    # Cleanup instructor assignments
    Class.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
    
    db.session.delete(target)
    db.session.commit()
    
    log_admin_action(admin.id, "USER_DELETED", f"Deleted user {target.username} (ID: {user_id})")
    return jsonify({"message": "User deleted"}), 200

@app.route('/api/admin/users/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def admin_reset_password(admin, user_id):
    """Reset User Password"""
    target = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data.get('new_password'):
        return jsonify({"error": "New password required"}), 400
        
    target.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()
    
    log_admin_action(admin.id, "PASSWORD_RESET", f"Reset password for {target.username}")
    return jsonify({"message": "Password reset successfully"}), 200

@app.route('/api/admin/users/<int:user_id>/email', methods=['PUT'])
@admin_required
def admin_update_email(admin, user_id):
    """Update User Email"""
    target = User.query.get_or_404(user_id)
    data = request.get_json()
    
    new_email = data.get('new_email')
    if not new_email:
        return jsonify({"error": "New email required"}), 400
        
    # Check if email is already taken
    if User.query.filter_by(email=new_email).first():
        return jsonify({"error": "Email already in use"}), 400
        
    target.email = new_email
    db.session.commit()
    
    log_admin_action(admin.id, "EMAIL_UPDATED", f"Updated email for {target.username} to {new_email}")
    return jsonify({"message": "Email updated successfully"}), 200

@app.route('/api/admin/config', methods=['GET'])
@admin_required
def admin_get_config(admin):
    configs = {c.key:c.value for c in SystemConfig.query.all()}
    for k, v in {'execution_timeout':'5', 'enabled_languages':'python,java,csharp', 'xp_multiplier':'1.0', 'plagiarism_threshold':'0.85', 'maintenance_mode':'false'}.items():
        configs.setdefault(k, v)
    return jsonify(configs), 200

@app.route('/api/admin/config', methods=['PUT'])
@admin_required
def admin_update_config(admin):
    data = request.get_json()
    allowed = {'execution_timeout','enabled_languages','xp_multiplier','plagiarism_threshold','maintenance_mode'}
    if not all(k in allowed for k in data.keys()): return jsonify({"error": "Invalid config keys"}), 400
    changes = []
    for k, v in data.items():
        existing = SystemConfig.query.filter_by(key=k).first()
        old_val = existing.value if existing else "N/A"
        if existing: existing.value = str(v)
        else: db.session.add(SystemConfig(key=k, value=str(v)))
        changes.append(f"{k}: {old_val} -> {v}")
    db.session.commit()
    log_admin_action(admin.id, "CONFIG_UPDATED", f"Changes: {', '.join(changes)}")
    return jsonify({"message": "Config updated", "changes": changes}), 200

@app.route('/api/admin/audit-logs', methods=['GET'])
@admin_required
def admin_get_logs(admin):
    action = request.args.get('action')
    limit = min(request.args.get('limit', 50, type=int), 200)
    q = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit)
    if action: q = q.filter_by(action=action)
    logs = q.all()
    return jsonify([{"id":l.id, "admin":User.query.get(l.admin_id).username if l.admin_id else "System", "action":l.action, "details":l.details, "ip":l.ip_address, "created_at":l.created_at.isoformat()} for l in logs]), 200

@app.route('/api/admin/reports', methods=['GET'])
@admin_required
def admin_generate_report(admin):
    fmt = request.args.get('format', 'csv')
    start = request.args.get('start')
    end = request.args.get('end')
    
    q = Submission.query
    if start: q = q.filter(Submission.submitted_at >= datetime.fromisoformat(start))
    if end: q = q.filter(Submission.submitted_at <= datetime.fromisoformat(end))
    subs = q.all()
    
    if fmt == 'csv':
        si = StringIO()
        cw = csv.writer(si)
        cw.writerow(["Submission ID", "User", "Problem", "Language", "Status", "Score", "Timestamp"])
        for s in subs:
            u = User.query.get(s.user_id)
            p = Problem.query.get(s.problem_id)
            cw.writerow([s.id, u.username if u else "Unknown", p.title if p else "Unknown", s.language, s.status, s.score, s.submitted_at.isoformat()])
        output = si.getvalue()
        return app.response_class(output, mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=submissions_report.csv"})
    
    return jsonify({"error": "Unsupported format"}), 400

# ===== ADMIN BLOCK ROUTES =====
@app.route('/api/admin/blocks', methods=['GET'])
@admin_required
def admin_get_blocks(admin):
    """Get all blocks/sections with SEPARATE stats for students vs instructors"""
    blocks = Class.query.all()
    result = []
    
    for block in blocks:
        # Count Students (from class_students table)
        student_count = db.session.query(class_students.c.student_id).filter_by(class_id=block.id).count()
        
        # Count Instructors (from classes.instructor_id)
        instructor = User.query.get(block.instructor_id)
        instructor_name = instructor.username if instructor else None
        
        result.append({
            "id": block.id,
            "section_code": block.section_code,
            "name": block.name,
            "semester": block.semester,
            "instructor": instructor_name,
            "instructor_id": block.instructor_id,
            "student_count": student_count, # ✅ Correctly counts only students
            "instructor_count": 1 if instructor else 0, # ✅ Separate instructor count
            "created_at": block.created_at.isoformat()
        })
    
    return jsonify(result), 200

@app.route('/api/admin/blocks', methods=['POST'])
@admin_required
def admin_create_block(admin):
    """Create new block/section"""
    data = request.get_json()
    
    if not all(k in data for k in ['section_code', 'name']):
        return jsonify({"error": "Missing required fields: section_code, name"}), 400
    
    if Class.query.filter_by(section_code=data['section_code']).first():
        return jsonify({"error": "Block code already exists"}), 400
    
    new_block = Class(
        section_code=data['section_code'],
        name=data['name'],
        semester=data.get('semester', ''),
        instructor_id=data.get('instructor_id')
    )
    
    db.session.add(new_block)
    db.session.commit()
    
    log_admin_action(admin.id, "CREATE_BLOCK", f"Created block {new_block.section_code}: {new_block.name}", new_block.id)
    
    return jsonify({"message": "Block created", "block_id": new_block.id}), 201

@app.route('/api/admin/blocks/<int:block_id>', methods=['PUT'])
@admin_required
def admin_update_block(admin, block_id):
    """Update block details"""
    block = Class.query.get_or_404(block_id)
    data = request.get_json()
    changes = []
    
    if 'name' in data:
        changes.append(f"Name: {block.name} → {data['name']}")
        block.name = data['name']
    
    if 'section_code' in data:
        changes.append(f"Code: {block.section_code} → {data['section_code']}")
        block.section_code = data['section_code']
    
    if 'semester' in data:
        block.semester = data['semester']
        changes.append(f"Semester: {data['semester']}")
    
    if 'instructor_id' in data:
        block.instructor_id = data['instructor_id']
        changes.append(f"Instructor ID: {data['instructor_id']}")
    
    db.session.commit()
    log_admin_action(admin.id, "UPDATE_BLOCK", f"Updated block {block.section_code}: {', '.join(changes)}", block_id)
    
    return jsonify({"message": "Block updated", "changes": changes}), 200

@app.route('/api/admin/blocks/<int:block_id>', methods=['DELETE'])
@admin_required
def admin_delete_block(admin, block_id):
    """Delete block"""
    block = Class.query.get_or_404(block_id)
    section_code = block.section_code
    
    db.session.delete(block)
    db.session.commit()
    
    log_admin_action(admin.id, "DELETE_BLOCK", f"Deleted block {section_code}", block_id)
    
    return jsonify({"message": "Block deleted"}), 200

# ===== UTILITY & INIT =====
@app.route('/api/health')
def health(): return jsonify({"status": "running", "version": "1.0"}), 200

with app.app_context():
    # 1. Create Tables
    db.create_all()
    
    # 2. Migration: Add New Columns to Problems Table
    try:
        inspector = inspect(db.engine)
        problem_columns = [col['name'] for col in inspector.get_columns('problems')]
        
        # Helper to add column if missing
        def add_col_if_missing(col_name, col_def):
            if col_name not in problem_columns:
                with db.engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE problems ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                    print(f"✅ Added column '{col_name}' to problems table")

        # Add Phase 1 Columns
        add_col_if_missing('problem_type', "ENUM('coding', 'debugging') DEFAULT 'coding'")
        add_col_if_missing('languages', "JSON DEFAULT ('[\"python\"]')")
        add_col_if_missing('is_event_quest', "BOOLEAN DEFAULT 0")
        add_col_if_missing('visible_to_blocks', "JSON DEFAULT ('[]')")
        add_col_if_missing('hints', "JSON DEFAULT ('[]')")
        add_col_if_missing('tags', "JSON DEFAULT ('[]')")
        add_col_if_missing('prerequisites', "JSON DEFAULT ('[]')")
        add_col_if_missing('estimated_time', "VARCHAR(50)")
        add_col_if_missing('partial_credit', "INTEGER DEFAULT 100")
        add_col_if_missing('auto_grade', "BOOLEAN DEFAULT 1")
        add_col_if_missing('plagiarism_threshold', "FLOAT DEFAULT 0.85")
        
    except Exception as e:
        print(f"⚠️ Migration check skipped or failed: {e}")
    
    if not SystemConfig.query.first():
        for k,v in {'execution_timeout':'5','enabled_languages':'python,java,csharp','xp_multiplier':'1.0','plagiarism_threshold':'0.85','maintenance_mode':'false'}.items():
            db.session.add(SystemConfig(key=k, value=v))
        db.session.commit()
    
    print("✅ DB Initialized | 🔐 JWT | 🎮 Gamification | 📚 Sections | 🛡️ Admin System")

if __name__ == '__main__':
    print("🚀 Forge.dev Backend | 📊 System-Ready | 🧪 Sandbox Active")
    app.run(debug=True, host='0.0.0.0', port=5000)