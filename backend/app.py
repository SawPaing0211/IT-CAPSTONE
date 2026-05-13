from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, decode_token
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import subprocess, sys, time, csv, json, io, unicodedata, re, base64, secrets, string
from io import StringIO
from sqlalchemy import text, inspect
from routes.sandbox import sandbox_bp, _run_in_docker

app = Flask(__name__)
app.register_blueprint(sandbox_bp)
app.config['SECRET_KEY'] = 'dev-secret-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/forge_dev'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, origins=["http://localhost:5173"], supports_credentials=True)
jwt = JWTManager(app)
db = SQLAlchemy(app)

# ===== RATE LIMITING =====
rate_limit_store = {}
login_fail_store = {}   # { ip: {'count': n, 'locked_until': timestamp} }

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
# ===== ACHIEVEMENT MODELS =====
class Achievement(db.Model):
    __tablename__ = 'achievements'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(50), nullable=False)
    xp_reward = db.Column(db.Integer, default=0)
    requirement_type = db.Column(db.String(50), nullable=False)  # e.g., 'quest_count', 'streak'
    requirement_value = db.Column(db.Integer, nullable=False)
    category = db.Column(db.Enum('student', 'instructor'), default='student')

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    progress = db.Column(db.Integer, default=0)
    
    user = db.relationship('User', backref=db.backref('user_achievements', lazy=True))
    achievement = db.relationship('Achievement')

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('student', 'instructor', 'super_admin'), default='student')
    full_name = db.Column(db.String(200), nullable=True)
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

class Problem(db.Model):
    __tablename__ = 'problems'
    __table_args__ = (
        db.Index('idx_problem_published_subject', 'is_published', 'subject_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Enum('Easy', 'Medium', 'Hard'), nullable=False)
    category = db.Column(db.String(100))
    test_cases = db.Column(db.JSON, nullable=False)
    starter_code = db.Column(db.JSON)  # Stores {language: code}
    xp_reward = db.Column(db.Integer, nullable=False)
    is_published = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ===== PRO FEATURES (Phase 1) =====
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
    due_date = db.Column(db.DateTime, nullable=True)  # NEW: For quest deadlines
    # ✅ NEW: Subject ownership (Phase 2)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)

class Submission(db.Model):
    __tablename__ = 'submissions'
    __table_args__ = (
        db.Index('idx_submission_user_problem', 'user_id', 'problem_id'),
        db.Index('idx_submission_user_status', 'user_id', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    problem_id = db.Column(db.Integer, db.ForeignKey('problems.id'), nullable=False)
    code = db.Column(db.Text, nullable=False)
    language = db.Column(db.Enum('python', 'java', 'csharp'), nullable=False)
    status       = db.Column(db.Enum(
                       'accepted', 'partial', 'wrong_answer',
                       'timeout', 'error', 'compile_error'
                   ), nullable=False, default='error')
    score        = db.Column(db.Integer, default=0)
    passed_cases = db.Column(db.Integer, default=0)
    total_cases  = db.Column(db.Integer, default=0)
    exec_ms      = db.Column(db.Integer, default=0)
    error_msg    = db.Column(db.Text,    nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

class Announcement(db.Model):
    __tablename__ = 'announcements'
    id = db.Column(db.Integer, primary_key=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) 
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    priority = db.Column(db.Enum('low', 'medium', 'high', 'urgent'), default='medium')  # NEW
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ── Block model — academic section ────────────────────────────────────
class Block(db.Model):
    __tablename__ = 'blocks'
    id            = db.Column(db.Integer,    primary_key=True)
    section_code  = db.Column(db.String(20), nullable=False)
    semester      = db.Column(db.String(50), nullable=True)
    academic_year = db.Column(db.String(9),  nullable=False, default='2024-2025')
    year_level    = db.Column(db.Integer,    nullable=False, default=1)
    max_students  = db.Column(db.Integer,    nullable=False, default=45)
    is_active     = db.Column(db.Boolean,    nullable=False, default=True)
    instructor_id = db.Column(db.Integer,    db.ForeignKey('users.id'), nullable=True)
    created_at    = db.Column(db.DateTime,   default=datetime.utcnow)

# ── Subject model — IT/programming subjects only ──────────────────────
class Subject(db.Model):
    __tablename__ = 'subjects'
    id                  = db.Column(db.Integer, primary_key=True)
    internal_subject_no = db.Column(db.String(10),  nullable=True)
    name                = db.Column(db.String(200),  nullable=False)
    description         = db.Column(db.Text,         nullable=True)
    subject_code        = db.Column(db.String(20),   nullable=True, unique=True)
    units               = db.Column(db.Integer,      nullable=True)
    department          = db.Column(db.String(100),  nullable=True)
    year_level          = db.Column(db.Integer,      nullable=True)
    semester            = db.Column(db.Integer,      nullable=True)
    subject_type        = db.Column(
                            db.Enum('lecture', 'lab', 'lecture_lab', 'elective'),
                            nullable=True, default='lab')
    # Forge.dev supports Lab-type subjects only. Each subject should be offered
    # in 3-5 Class Codes (sections) to accommodate regular and irregular students.
    supported_languages = db.Column(db.String(100),  nullable=False, default='python')
    default_difficulty  = db.Column(db.String(10),   nullable=False, default='easy')
    is_active           = db.Column(db.Boolean,      nullable=False, default=True)
    created_at          = db.Column(db.DateTime,     default=datetime.utcnow)

# ===== COURSE MATERIALS MODELS =====
class Lesson(db.Model):
    __tablename__ = 'lessons'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    week_number = db.Column(db.Integer, nullable=False)  # Week 1, 2, 3...
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    block_id = db.Column(db.Integer, db.ForeignKey('blocks.id'), nullable=True)  # ✅ NEW: Target specific block (NULL = All Blocks)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Instructor
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subject = db.relationship('Subject', backref=db.backref('lessons', lazy=True))
    block = db.relationship('Block', backref=db.backref('lessons', lazy=True))  # ✅ NEW
    instructor = db.relationship('User', backref=db.backref('created_lessons', lazy=True))
    files = db.relationship('LessonFile', backref='lesson', lazy=True, cascade='all, delete-orphan')

class LessonFile(db.Model):
    __tablename__ = 'lesson_files'
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)  # Secure server name (UUID)
    original_filename = db.Column(db.String(255), nullable=False)  # User's original name
    file_type = db.Column(db.String(50), nullable=False)  # pdf, pptx, docx, mp4, etc.
    file_size = db.Column(db.Integer, nullable=False)  # in bytes
    storage_path = db.Column(db.String(500), nullable=False)  # relative path to uploads folder
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

# ✅ NEW: Teacher Assignment (Who teaches what, where)
class TeacherAssignment(db.Model):
    __tablename__ = 'teacher_assignments'
    __table_args__ = (
        db.UniqueConstraint('instructor_id', 'subject_id', 'block_id',
                            name='unique_teacher_assignment'),
    )
    id = db.Column(db.Integer, primary_key=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    block_id = db.Column(db.Integer, db.ForeignKey('blocks.id'), nullable=False)

# ✅ NEW: Block-Subject junction table
block_subjects = db.Table('block_subjects',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('block_id', db.Integer, db.ForeignKey('blocks.id'), nullable=False),
    db.Column('subject_id', db.Integer, db.ForeignKey('subjects.id'), nullable=False),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    db.UniqueConstraint('block_id', 'subject_id', name='unique_block_subject')
)

# ✅ NEW: Student-Block enrollment table
student_blocks = db.Table('student_blocks',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('student_id', db.Integer, db.ForeignKey('users.id'), nullable=False),
    db.Column('block_id', db.Integer, db.ForeignKey('blocks.id'), nullable=False),
    db.Column('enrolled_at', db.DateTime, default=datetime.utcnow),
    db.UniqueConstraint('student_id', 'block_id', name='unique_student_block')
)

# ✅ NEW: Block-Problems junction table
block_problems = db.Table('block_problems',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('block_id', db.Integer, db.ForeignKey('blocks.id'), nullable=False),
    db.Column('problem_id', db.Integer, db.ForeignKey('problems.id'), nullable=False),
    db.UniqueConstraint('block_id', 'problem_id', name='unique_block_problem')
)

# ⚠️ Keep old Class model for backward compatibility (can be removed later)
class Class(db.Model):
    __tablename__ = 'classes'
    id = db.Column(db.Integer, primary_key=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    section_code = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SubjectSection(db.Model):
    __tablename__ = 'subject_sections'
    id            = db.Column(db.Integer, primary_key=True)
    section_no    = db.Column(db.String(20),  nullable=False)
    subject_id    = db.Column(db.Integer,     db.ForeignKey('subjects.id'), nullable=False)
    block_id      = db.Column(db.Integer,     db.ForeignKey('blocks.id'),   nullable=True)
    schedule      = db.Column(db.String(100), nullable=True)
    room          = db.Column(db.String(50),  nullable=True)
    capacity      = db.Column(db.Integer,     nullable=False, default=40)
    current_count = db.Column(db.Integer,     nullable=False, default=0)
    semester      = db.Column(db.String(50),  nullable=True)
    academic_year = db.Column(db.String(9),   nullable=True)
    is_active     = db.Column(db.Boolean,     nullable=False, default=True)
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)

class IrregularEnrollment(db.Model):
    __tablename__ = 'irregular_enrollments'
    __table_args__ = (
        db.UniqueConstraint('student_id', 'section_id', name='unique_irregular_enrollment'),
    )
    id          = db.Column(db.Integer, primary_key=True)
    student_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    section_id  = db.Column(db.Integer, db.ForeignKey('subject_sections.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

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

# ============================================================
# IT SUBJECT CONSTANTS — Forge.dev scope (final confirmed)
# 12 subjects | 6 LEC/LAB pairs | Python, Java, C# only
# ============================================================
SUPPORTED_IT_SUBJECTS = [
    # Year 1, Semester 1
    ("290007", "IT115",  "Introduction to Computing Lec",      2, "lecture", 1, 1),
    ("290008", "IT115L", "Introduction to Computing Lab",      1, "lab",     1, 1),
    ("290009", "IT116",  "Fundamentals of Programming Lec",    2, "lecture", 1, 1),
    ("290010", "IT116L", "Fundamentals of Programming Lab",    1, "lab",     1, 1),
    # Year 1, Semester 2
    ("290013", "IT125",  "Computer Programming 1 Lec",         2, "lecture", 1, 2),
    ("290014", "IT125L", "Computer Programming 1 Lab",         1, "lab",     1, 2),
    ("290015", "IT126",  "Data Structure & Algorithm Lec",     2, "lecture", 1, 2),
    ("290016", "IT126L", "Data Structure & Algorithm Lab",     1, "lab",     1, 2),
    # Year 2, Semester 1
    ("290017", "IT215",  "Database Management System Lec",     2, "lecture", 2, 1),
    ("290018", "IT215L", "Database Management System Lab",     1, "lab",     2, 1),
    ("290019", "IT216",  "Computer Programming 2 Lec",         2, "lecture", 2, 1),
    ("290020", "IT216L", "Computer Programming 2 Lab",         1, "lab",     2, 1),
    # Year 2, Semester 2
    ("290025", "IT225",  "Object Oriented Programming Lec",    2, "lecture", 2, 2),
    ("290026", "IT225L", "Object Oriented Programming Lab",    1, "lab",     2, 2),
    ("290027", "IT226",  "Adv. Database Mgt System Lec",       2, "lecture", 2, 2),
    ("290028", "IT226L", "Adv. Database Mgt System Lab",       1, "lab",     2, 2),
]

SUBJECT_LANGUAGE_MAP = {
    "IT115":  "python",
    "IT115L": "python",
    "IT116":  "python",
    "IT116L": "python",
    "IT125":  "python,java,csharp",
    "IT125L": "python,java,csharp",
    "IT126":  "python,java,csharp",
    "IT126L": "python,java,csharp",
    "IT215":  "python,java,csharp",
    "IT215L": "python,java,csharp",
    "IT216":  "java,csharp",
    "IT216L": "java,csharp",
    "IT225":  "java,csharp,python",
    "IT225L": "java,csharp,python",
    "IT226":  "java,csharp,python",
    "IT226L": "java,csharp,python",
}

SUBJECT_DIFFICULTY_DEFAULTS = {
    "IT115":  "easy",   "IT115L": "easy",
    "IT116":  "easy",   "IT116L": "easy",
    "IT125":  "easy",   "IT125L": "easy",
    "IT126":  "medium", "IT126L": "medium",
    "IT215":  "medium", "IT215L": "medium",
    "IT216":  "medium", "IT216L": "medium",
    "IT225":  "medium", "IT225L": "medium",
    "IT226":  "hard",   "IT226L": "hard",
}

SUPPORTED_SUBJECT_CODES = frozenset(row[1] for row in SUPPORTED_IT_SUBJECTS)


def validate_it_subject_scope(subject_code: str):
    if not subject_code:
        return False, "Subject code is required."
    code = subject_code.upper().strip()
    if code in SUPPORTED_SUBJECT_CODES:
        return True, ""
    NON_IT = ('TH', 'PE', 'HI', 'HU', 'PY', 'EN', 'NS', 'CM', 'PC', 'MH', 'NSTP')
    for prefix in NON_IT:
        if code.startswith(prefix):
            return False, (
                f"'{subject_code}' is a non-IT subject and is not supported by Forge.dev. "
                f"Only IT programming subjects (IT115–IT225L) are in scope."
            )
    return False, (
        f"'{subject_code}' is not in the supported subject list. "
        f"Supported codes: {', '.join(sorted(SUPPORTED_SUBJECT_CODES))}"
    )


def seed_it_subjects():
    seeded, skipped = 0, 0
    for row in SUPPORTED_IT_SUBJECTS:
        internal_no, code, name, units, stype, yr, sem = row
        if Subject.query.filter_by(subject_code=code).first():
            skipped += 1
            continue
        db.session.add(Subject(
            internal_subject_no = internal_no,
            subject_code        = code,
            name                = name,
            units               = units,
            subject_type        = stype,
            year_level          = yr,
            semester            = sem,
            department          = 'CCIT',
            supported_languages = SUBJECT_LANGUAGE_MAP.get(code, 'python'),
            default_difficulty  = SUBJECT_DIFFICULTY_DEFAULTS.get(code, 'easy'),
            is_active           = True
        ))
        seeded += 1
    db.session.commit()
    return {'seeded': seeded, 'skipped': skipped, 'total': len(SUPPORTED_IT_SUBJECTS)}


# ===== HELPERS =====
def is_instructor_or_admin(user): return user and user.role in ['instructor', 'super_admin']
def is_super_admin(user): return user and user.role == 'super_admin'

# ✅ NEW: Check if instructor is assigned to teach a subject in a block
def is_instructor_assigned(instructor_id, subject_id, block_id=None):
    """Verify instructor has official assignment to teach subject (optionally in specific block)"""
    query = TeacherAssignment.query.filter_by(
        instructor_id=instructor_id, 
        subject_id=subject_id
    )
    if block_id:
        query = query.filter_by(block_id=block_id)
    return query.first() is not None

# ✅ NEW: Get all blocks an instructor teaches a specific subject in
def get_instructor_blocks_for_subject(instructor_id, subject_id):
    """Return list of block IDs where instructor teaches this subject"""
    assignments = TeacherAssignment.query.filter_by(
        instructor_id=instructor_id, 
        subject_id=subject_id
    ).all()
    return [a.block_id for a in assignments]

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not is_super_admin(user):
            return jsonify({"error": "Super Admin access required"}), 403
        return f(user, *args, **kwargs)
    return decorated

def log_admin_action(admin_id, action, details=None, target_id=None):
    try:
        log = AuditLog(
            admin_id=admin_id,
            action=action,
            details=details or "",
            target_id=target_id,
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ audit log failed: {e}")

def sanitize_code(code, language):
    """
    Simple substring checks — no regex, no ReDoS risk.
    Returns True if code is considered safe, False otherwise.
    """
    if language == 'python':
        dangerous_patterns = [
            '__import__',
            'os.system',
            'os.popen',
            'os.exec',
            'subprocess',
            'eval(',
            'exec(',
            'open(',
            'import os',
            'import sys',
            'import socket',
            'import shutil',
            'importlib',
            'pty.spawn',
            'ctypes',
        ]
        code_lower = code.lower()
        return not any(pattern.lower() in code_lower for pattern in dangerous_patterns)
    return True

def _run_in_docker_with_stdin(code: str, language: str, stdin_input: str) -> dict:
    """
    like _run_in_docker() but pipes stdin_input into the container.
    student code is written untouched; the wrapper reads from stdin.
    """
    import tempfile, os, time

    from routes.sandbox import (
        DOCKER_IMAGES, MEM_LIMITS, CAP_DROP, SECURITY_OPTS,
        LANGUAGE_TIMEOUTS, LIMITS,
        _write_source, _generate_java_wrapper, _generate_csharp_wrapper,
        _get_docker_client,
    )

    client  = _get_docker_client()
    image   = DOCKER_IMAGES[language]
    started = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = _write_source(tmpdir, code, language)
        filename = os.path.basename(src_path)

        # ── Write input to file so container can read it ──────────────────
        # ✅ cap stdin to prevent sandbox abuse
        max_input_size = 64 * 1024  # 64kb
        if stdin_input and len(stdin_input.encode('utf-8')) > max_input_size:
            return {
                'stdout': '',
                'stderr': 'input too large (max 64kb)',
                'returncode': -1,
                'elapsed': 0,
                'timed_out': False,
                'timeout_used': 0
            }

        input_path = os.path.join(tmpdir, 'input.txt')
        with open(input_path, 'w', encoding='utf-8') as f:
            f.write(stdin_input if stdin_input else '')

        if language == 'java':
            with open(os.path.join(tmpdir, 'Main.java'), 'w', encoding='utf-8') as f:
                f.write(_generate_java_wrapper())
        elif language == 'csharp':
            with open(os.path.join(tmpdir, 'Program.cs'), 'w', encoding='utf-8') as f:
                f.write(_generate_csharp_wrapper())

        container_src = f'/tmp/sandbox/{filename}'

        try:
            container = client.containers.run(
                image=image,
                command=[container_src],
                # stdin_open removed — using file-based input

                volumes={tmpdir: {'bind': '/tmp/sandbox', 'mode': 'ro'}},
                tmpfs={
                    '/tmp':      'size=256m,mode=1777',
                    '/tmp/work': 'size=256m,mode=1777',
                },

                network_disabled=True,
                read_only=True,
                cap_drop=CAP_DROP[language],
                security_opt=SECURITY_OPTS[language],
                mem_limit=MEM_LIMITS[language],
                memswap_limit=MEM_LIMITS[language],
                cpu_period=LIMITS['cpu_period'],
                cpu_quota=LIMITS['cpu_quota'],
                pids_limit=LIMITS['pids_limit'],

                detach=True,
                remove=False,
                stdout=True,
                stderr=True,

                environment={
                    'PYTHONUNBUFFERED':                  '1',
                    'DOTNET_CLI_TELEMETRY_OPTOUT':       '1',
                    'JAVA_OPTS':                         '-XX:TieredStopAtLevel=1',
                    'HOME':                              '/dotnet-sentinel',
                    'DOTNET_CLI_HOME':                   '/dotnet-sentinel/.dotnet',
                    'NUGET_PACKAGES':                    '/dotnet-sentinel/.nuget/packages',
                    'NUGET_HTTP_CACHE_PATH':             '/tmp/work/.nuget-http-cache',
                    'NUGET_SCRATCH':                     '/tmp/work/.nuget-scratch',
                    'DOTNET_NOLOGO':                     '1',
                    'DOTNET_SKIP_FIRST_TIME_EXPERIENCE': '1',
                    'DOTNET_MULTILEVEL_LOOKUP':          '0',
                },
            )

            # Input is already in /tmp/sandbox/input.txt — nothing to pipe

            try:
                timeout    = LANGUAGE_TIMEOUTS.get(language, LIMITS['timeout_seconds'])
                result_obj = container.wait(timeout=timeout)
                timed_out  = False
                returncode = result_obj.get('StatusCode', -1)
            except Exception:
                try: container.kill()
                except Exception: pass
                timed_out  = True
                returncode = -1

            raw_stdout = raw_stderr = b''
            try:
                raw_stdout = container.logs(stdout=True,  stderr=False)
                raw_stderr = container.logs(stdout=False, stderr=True)
            except Exception:
                pass

            try: container.remove(force=True)
            except Exception: pass

            stdout = raw_stdout.decode('utf-8', errors='replace')
            stderr = raw_stderr.decode('utf-8', errors='replace')
            max_b  = LIMITS['output_bytes']
            if len(stdout) > max_b:
                stdout = stdout[:max_b] + '\n⚠️ [Output truncated]'
            if len(stderr) > max_b:
                stderr = stderr[:max_b] + '\n⚠️ [Error truncated]'

            elapsed_ms = int((time.time() - started) * 1000)
            return {
                'stdout':       stdout,
                'stderr':       stderr,
                'returncode':   returncode,
                'elapsed':      elapsed_ms,
                'timed_out':    timed_out,
                'timeout_used': timeout,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - started) * 1000)
            return {
                'stdout': '', 'stderr': '',
                'error':  f'💥 Execution error: {str(e)}',
                'returncode': -1, 'elapsed': elapsed_ms, 'timed_out': False,
            }


def evaluate_code(code, test_cases, language):
    """Execute code in Docker sandbox and compare against test cases"""
    results = []

    for tc in test_cases:
        input_val = tc.get('input', '').strip()
        expected  = tc.get('expected', '').strip()

        result = _run_in_docker_with_stdin(code, language, input_val)

        actual    = result.get('stdout', '').strip()
        stderr    = result.get('stderr', '').strip()
        timed_out = result.get('timed_out', False)
        error     = result.get('error', '')

        if timed_out:
            results.append({
                "test_case": input_val[:50],
                "expected":  expected[:50],
                "passed":    False,
                "output":    "Timeout: execution exceeded time limit",
                "runtime":   f"{result.get('elapsed', 0)/1000:.2f}s",
                "message":   "Execution timeout"
            })
        elif error or (result.get('returncode', 0) != 0 and not actual):
            results.append({
                "test_case": input_val[:50],
                "expected":  expected[:50],
                "passed":    False,
                "output":    (stderr or error)[:500],
                "runtime":   f"{result.get('elapsed', 0)/1000:.2f}s",
                "message":   (stderr or error)[:80]
            })
        else:
            passed = actual == expected
            results.append({
                "test_case": input_val[:50],
                "expected":  expected[:50],
                "passed":    passed,
                "output":    actual[:100],
                "runtime":   f"{result.get('elapsed', 0)/1000:.2f}s",
                "message":   "Passed" if passed else f"Expected: {expected[:50]}"
            })

    return results

# ===== AUTH ROUTES =====
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not all(k in data for k in ['username','email','password']): 
        return jsonify({"error": "Missing fields"}), 400
    if User.query.filter_by(username=data['username']).first() or User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Username or email exists"}), 400
    
    new_user = User(
        username=data['username'], 
        email=data['email'], 
        password_hash=generate_password_hash(data['password']), 
        role=data.get('role','student')
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        "message": "Created", 
        "access_token": create_access_token(identity=str(new_user.id)), 
        "user": {"id": new_user.id, "username": new_user.username, "role": new_user.role}
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('username') or not data.get('password'): 
        return jsonify({"error": "Missing credentials"}), 400
    
    identifier = data['username'].strip()
    ip = request.remote_addr
    now = time.time()

    # Check if IP is locked out
    fail_record = login_fail_store.get(ip, {'count': 0, 'locked_until': 0})
    if fail_record['locked_until'] > now:
        remaining = int(fail_record['locked_until'] - now)
        return jsonify({"error": f"Too many failed attempts. Try again in {remaining} seconds."}), 429

    user = (
        User.query.filter_by(username=identifier).first() or
        User.query.filter_by(email=identifier).first()
    )

    # Check account-level lockout first
    if user and user.locked_until:
        if user.locked_until > datetime.utcnow():
            remaining = int((user.locked_until - datetime.utcnow()).total_seconds())
            return jsonify({
                "error": "Account locked",
                "message": f"Your account has been locked after 3 failed attempts. Please contact your administrator.",
                "contact": "admin@adamson.edu.ph",
                "locked_until": user.locked_until.isoformat(),
                "remaining_seconds": remaining
            }), 423
        else:
            # Auto-unlock after 15 min
            user.login_attempts = 0
            user.locked_until = None
            db.session.commit()

    if not user or not check_password_hash(user.password_hash, data['password']):
        if user:
            user.login_attempts = (user.login_attempts or 0) + 1
            if user.login_attempts >= 3:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                db.session.commit()
                return jsonify({
                    "error": "Account locked",
                    "message": "Your account has been locked after 3 failed attempts. Please contact your administrator.",
                    "contact": "admin@adamson.edu.ph",
                    "locked_until": user.locked_until.isoformat(),
                    "remaining_seconds": 900
                }), 423
            db.session.commit()
            attempts_left = 3 - user.login_attempts
            return jsonify({
                "error": "Invalid credentials",
                "attempts_left": attempts_left,
                "warning": f"{attempts_left} attempt(s) remaining before account lockout."
            }), 401
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active: 
        return jsonify({"error": "Account disabled"}), 403

    # Clear fail record and login attempts on successful login
    login_fail_store.pop(ip, None)
    user.login_attempts = 0
    user.locked_until = None
    db.session.commit()
    
    # 🔒 ADD THESE TWO LINES:
    refresh_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    
    return jsonify({
        "message": "Login successful", 
        "access_token": create_access_token(identity=str(user.id)),
        "refresh_token": refresh_token,  # 🔒 ADD THIS LINE
        "user": {
            "id": user.id, 
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role, 
            "xp": user.xp, 
            "level": user.level
        }
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user: 
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": user.id, 
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role, 
        "xp": user.xp, 
        "level": user.level
    }), 200

# 🔒 NEW: Token Refresh Endpoint
@app.route('/api/auth/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    if not data or 'refresh_token' not in data:
        return jsonify({'error': 'Refresh token required'}), 400
    try:
        decoded = decode_token(data['refresh_token'])
        user_id = decoded['sub']
        user = User.query.get(int(user_id))
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid refresh token'}), 401
        new_token = create_access_token(identity=str(user_id))
        return jsonify({'access_token': new_token})
    except Exception:
        return jsonify({'error': 'Invalid refresh token'}), 401

# ===== PROBLEM ROUTES =====
@app.route('/api/problems', methods=['POST'])
@jwt_required()
def create_problem():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): 
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    
    # Validation
    required = ['title','description','difficulty','xp_reward','test_cases']
    if not all(k in data for k in required): 
        return jsonify({"error": "Missing required fields"}), 400
    if data['difficulty'] not in ['Easy','Medium','Hard']: 
        return jsonify({"error": "Invalid difficulty"}), 400
    if not isinstance(data['test_cases'], list) or len(data['test_cases']) == 0: 
        return jsonify({"error": "At least one test case required"}), 400
    for i, tc in enumerate(data['test_cases']):
        if 'input' not in tc or 'expected' not in tc: 
            return jsonify({"error": f"Test case {i+1} invalid"}), 400

    # ✅ XP Validation based on difficulty
    max_xp = {
        'Easy': 100,
        'Medium': 250,
        'Hard': 500
    }
    
    # ✅ NEW: Validate subject assignment (Phase 2)
    subject_id = data.get('subject_id')
    if not subject_id:
        return jsonify({"error": "Course subject is required"}), 400
    
    # Verify instructor is assigned to teach this subject in at least one block
    if not is_instructor_assigned(user_id, subject_id):
        return jsonify({"error": "You are not assigned to teach this subject"}), 403
    
    # Validate block visibility matches instructor's assignments for this subject
    visible_blocks = data.get('visible_to_blocks', [])
    if visible_blocks:
        allowed_blocks = get_instructor_blocks_for_subject(user_id, subject_id)
        for bid in visible_blocks:
            if bid not in allowed_blocks:
                return jsonify({"error": f"You are not assigned to Block {bid} for this subject"}), 403
    # If visible_to_blocks is empty, it means visible to ALL blocks instructor teaches this subject in


    if data['xp_reward'] > max_xp[data['difficulty']]:
        return jsonify({
            "error": f"XP reward exceeds maximum for {data['difficulty']} difficulty. Maximum: {max_xp[data['difficulty']]}"
        }), 400

    # Handle starter_code: if string, parse as JSON; if dict, use as-is
    starter_code = data.get('starter_code', {})
    if isinstance(starter_code, str):
        try:
            starter_code = json.loads(starter_code)
        except:
            starter_code = {}

    # Parse due_date if provided
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.fromisoformat(data['due_date'])
        except:
            due_date = None

    p = Problem(
        subject_id=subject_id,  # ✅ NEW: Link problem to subject
        title=data['title'], 
        description=data['description'], 
        category=data.get('category','General'), 
        difficulty=data['difficulty'], 
        xp_reward=data['xp_reward'], 
        test_cases=data['test_cases'], 
        starter_code=starter_code, 
        is_published=data.get('is_published', False), 
        created_by=user.id,
        due_date=due_date,
        # PRO FEATURES
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
    
    # ===== ASSIGN PROBLEM TO BLOCKS (NEW TABLE) =====
    if p.visible_to_blocks:
        for block_id in p.visible_to_blocks:
            existing = db.session.query(block_problems).filter_by(
                block_id=block_id,
                problem_id=p.id
            ).first()
            
            if not existing:
                db.session.execute(block_problems.insert().values(
                    block_id=block_id,
                    problem_id=p.id
                ))
        db.session.commit()
    
    return jsonify({"message": "Problem created", "problem_id": p.id}), 201

@app.route('/api/problems', methods=['GET'])
@jwt_required()  # ✅ Ensure auth is required for student filtering
def get_problems():
    """Get published problems with filtering for block visibility & problem type"""
    user_id = int(get_jwt_identity())  # ✅ Get user_id once at top
    user = User.query.get(user_id)
    
    block_id = request.args.get('block_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    problem_type = request.args.get('type')
    
    query = Problem.query.filter_by(is_published=True)
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    if problem_type:
        query = query.filter_by(problem_type=problem_type)
    
    problems = query.all()
    filtered = []

    if user.role in ('instructor', 'super_admin'):
        for p in problems:
            if user.role == 'super_admin' or p.created_by == user_id:
                filtered.append(p)
    else:
        # Student path — get enrolled blocks once
        student_enrollment_rows = db.session.query(student_blocks.c.block_id).filter_by(
            student_id=user_id
        ).all()
        student_block_ids = [e.block_id for e in student_enrollment_rows]

        if not student_block_ids:
            return jsonify([]), 200

        for p in problems:
            # Must belong to a subject offered in at least one of the student's blocks
            if p.subject_id:
                subject_block_rows = db.session.query(block_subjects.c.block_id).filter_by(
                    subject_id=p.subject_id
                ).all()
                valid_subject_blocks = [r.block_id for r in subject_block_rows]
                if not any(bid in valid_subject_blocks for bid in student_block_ids):
                    continue

            # Block visibility check
            if p.visible_to_blocks:
                # Explicit list — student must be in one of the named blocks
                if block_id:
                    if block_id in p.visible_to_blocks and block_id in student_block_ids:
                        filtered.append(p)
                else:
                    if any(bid in p.visible_to_blocks for bid in student_block_ids):
                        filtered.append(p)
            else:
                # Empty = visible to all blocks where the CREATOR teaches this subject
                if p.created_by and p.subject_id:
                    creator_blocks = get_instructor_blocks_for_subject(
                        p.created_by, p.subject_id
                    )
                    if block_id:
                        if block_id in creator_blocks and block_id in student_block_ids:
                            filtered.append(p)
                    else:
                        if any(bid in creator_blocks for bid in student_block_ids):
                            filtered.append(p)
    
    result = []
    for p in filtered:
        # Parse starter_code if stored as string
        starter = p.starter_code
        if isinstance(starter, str):
            try:
                starter = json.loads(starter)
            except:
                starter = {}
        
        # Get instructor name
        instructor_name = "System"
        if p.created_by:
            instructor = User.query.get(p.created_by)
            if instructor:
                instructor_name = instructor.username
        
        # Get block section codes
        block_names = []
        if p.visible_to_blocks:
            for bid in p.visible_to_blocks:
                block = Block.query.get(bid)
                if block:
                    block_names.append(block.section_code)
        
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
            "starter_code": starter,
            "test_cases": p.test_cases,
            "estimated_time": p.estimated_time,
            "partial_credit": p.partial_credit,
            "auto_grade": p.auto_grade,
            "due_date": p.due_date.isoformat() if p.due_date else None,
            "instructor_name": instructor_name,
            "block_names": block_names,
            "created_at": p.created_at.isoformat()
        })
    
    return jsonify(result), 200

@app.route('/api/problems/<int:problem_id>', methods=['GET'])
def get_problem_detail(problem_id):
    """Get single problem details (for student code editor)"""
    problem = Problem.query.get_or_404(problem_id)
    if not problem.is_published:
        return jsonify({"error": "Problem not available"}), 404
    
    # Parse starter_code
    starter = problem.starter_code
    if isinstance(starter, str):
        try:
            starter = json.loads(starter)
        except:
            starter = {}
    
    # Get instructor name
    instructor_name = "System"
    if problem.created_by:
        instructor = User.query.get(problem.created_by)
        if instructor:
            instructor_name = instructor.username
    
    # ✅ Get block section codes (NEW TABLE)
    block_names = []
    if problem.visible_to_blocks:
        for bid in problem.visible_to_blocks:
            block = Block.query.get(bid)
            if block:
                block_names.append(block.section_code)
    
    return jsonify({
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "xp_reward": problem.xp_reward,
        "problem_type": problem.problem_type,
        "is_event_quest": problem.is_event_quest,
        "languages": problem.languages or ['python'],
        "hints": problem.hints or [],
        "starter_code": starter,
        "test_cases": problem.test_cases,
        "estimated_time": problem.estimated_time,
        "due_date": problem.due_date.isoformat() if problem.due_date else None,
        "instructor_name": instructor_name,  # ✅ NEW
        "block_names": block_names  # ✅ NEW
    }), 200

@app.route('/api/problems/<int:problem_id>', methods=['PUT'])
@jwt_required()
def update_problem(problem_id):
    """Update an existing problem (instructors/admins only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    problem = Problem.query.get_or_404(problem_id)
    
    # Verify ownership
    if problem.created_by != user_id and user.role != 'super_admin':
        return jsonify({"error": "Not your problem"}), 403
    
    data = request.get_json()
    
    # ===== VALIDATION (same as create) =====
    required = ['title', 'description', 'difficulty', 'xp_reward', 'test_cases']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    if data['difficulty'] not in ['Easy', 'Medium', 'Hard']:
        return jsonify({"error": "Invalid difficulty"}), 400
    
    if not isinstance(data['test_cases'], list) or len(data['test_cases']) == 0:
        return jsonify({"error": "At least one test case required"}), 400
    
    # XP Validation
    max_xp = {'Easy': 100, 'Medium': 250, 'Hard': 500}
    if data['xp_reward'] > max_xp[data['difficulty']]:
        return jsonify({
            "error": f"XP reward exceeds maximum for {data['difficulty']} difficulty"
        }), 400
    
    # Subject validation
    subject_id = data.get('subject_id')
    if not subject_id:
        return jsonify({"error": "Course subject is required"}), 400
    
    if not is_instructor_assigned(user_id, subject_id):
        return jsonify({"error": "You are not assigned to teach this subject"}), 403
    
    # ===== UPDATE FIELDS =====
    problem.title = data['title']
    problem.description = data['description']
    problem.difficulty = data['difficulty']
    problem.xp_reward = data['xp_reward']
    problem.category = data.get('category', problem.category)
    problem.test_cases = data['test_cases']
    problem.is_published = data.get('is_published', problem.is_published)
    problem.subject_id = subject_id
    
    # PRO FEATURES
    problem.problem_type = data.get('problem_type', problem.problem_type)
    problem.languages = data.get('languages', problem.languages)
    problem.is_event_quest = data.get('is_event_quest', problem.is_event_quest)
    problem.visible_to_blocks = data.get('visible_to_blocks', problem.visible_to_blocks)
    problem.hints = data.get('hints', problem.hints)
    problem.tags = data.get('tags', problem.tags)
    problem.prerequisites = data.get('prerequisites', problem.prerequisites)
    problem.estimated_time = data.get('estimated_time', problem.estimated_time)
    problem.partial_credit = data.get('partial_credit', problem.partial_credit)
    problem.auto_grade = data.get('auto_grade', problem.auto_grade)
    problem.plagiarism_threshold = data.get('plagiarism_threshold', problem.plagiarism_threshold)
    
    # Parse due_date
    if data.get('due_date'):
        try:
            problem.due_date = datetime.fromisoformat(data['due_date'])
        except:
            pass
    
    # Handle starter_code
    starter_code = data.get('starter_code')
    if starter_code:
        if isinstance(starter_code, str):
            try:
                starter_code = json.loads(starter_code)
            except:
                pass
        problem.starter_code = starter_code
    
    db.session.commit()
    
    # ===== UPDATE BLOCK ASSIGNMENTS =====
    if 'visible_to_blocks' in data:
        # Remove old assignments
        db.session.query(block_problems).filter_by(problem_id=problem_id).delete()
        # Add new assignments
        for block_id in data['visible_to_blocks']:
            db.session.execute(block_problems.insert().values(
                block_id=block_id,
                problem_id=problem_id
            ))
        db.session.commit()
    
    return jsonify({
        "message": "Problem updated successfully",
        "problem_id": problem.id
    }), 200

# ===== PROBLEM DELETE ENDPOINT =====
@app.route('/api/problems/<int:problem_id>', methods=['DELETE'])
@jwt_required()
def delete_problem(problem_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    problem = Problem.query.get_or_404(problem_id)  # ✅ THIS WAS MISSING
    
    if problem.created_by != user_id and user.role != 'super_admin':
        return jsonify({"error": "Not your problem"}), 403
    
    # Clean up related data in junction tables
    db.session.query(block_problems).filter_by(problem_id=problem_id).delete()
    Submission.query.filter_by(problem_id=problem_id).delete()
    
    db.session.delete(problem)
    db.session.commit()
    
    return jsonify({"message": "Problem deleted"}), 200

# ===== LESSON ROUTES =====
@app.route('/api/lessons', methods=['POST'])
@jwt_required()
def create_lesson():
    """Create a new lesson (instructors only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    
    # Validation
    required = ['title', 'description', 'week_number', 'subject_id']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Verify instructor is assigned to this subject
    if not is_instructor_assigned(user_id, data['subject_id']):
        return jsonify({"error": "You are not assigned to teach this subject"}), 403
    
    # ✅ Handle block_id validation
    block_id = data.get('block_id')
    if block_id:
        block = Block.query.get(block_id)
        if not block:
            return jsonify({"error": "Invalid block ID"}), 400
        if not is_instructor_assigned(user_id, data['subject_id'], block_id):
            return jsonify({"error": "You are not assigned to teach this subject in this block"}), 403
    
    # Create lesson
    lesson = Lesson(
        title=data['title'],
        description=data.get('description', ''),
        week_number=data['week_number'],
        subject_id=data['subject_id'],
        block_id=block_id,  # ✅ Can be NULL for "All Blocks"
        created_by=user_id,
        is_published=data.get('is_published', False)
    )
    
    db.session.add(lesson)
    db.session.commit()
    
    return jsonify({
        "message": "Lesson created",
        "lesson_id": lesson.id
    }), 201

@app.route('/api/lessons/<int:lesson_id>/files', methods=['POST'])
@jwt_required()
def upload_lesson_file(lesson_id):
    """Upload a file to a lesson (instructors only)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    lesson = Lesson.query.get_or_404(lesson_id)
    
    # Verify ownership
    if lesson.created_by != user_id and user.role != 'super_admin':
        return jsonify({"error": "Not your lesson"}), 403
    
    # Check if file was uploaded
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file type
    allowed_types = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip']
    file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if file_ext not in allowed_types:
        return jsonify({"error": f"File type .{file_ext} not allowed"}), 400
    
    # Validate file size (16MB max)
    if file.content_length and file.content_length > 16 * 1024 * 1024:
        return jsonify({"error": "File too large (max 16MB)"}), 400
    
    # Generate secure filename
    import uuid, os
    secure_name = f"{uuid.uuid4().hex}.{file_ext}"
    
    # Create uploads folder if not exists
    upload_dir = os.path.join('uploads', 'lessons', str(lesson_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, secure_name)
    file.save(file_path)
    
    # Create database record
    lesson_file = LessonFile(
        lesson_id=lesson_id,
        filename=secure_name,
        original_filename=file.filename,
        file_type=file_ext,
        file_size=file.content_length or 0,
        storage_path=file_path
    )
    
    db.session.add(lesson_file)
    db.session.commit()
    
    return jsonify({
        "message": "File uploaded",
        "file_id": lesson_file.id,
        "filename": file.filename
    }), 201

@app.route('/api/lessons', methods=['GET'])
@jwt_required()
def get_lessons():
    """Get all lessons (filtered by instructor's classes)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get all lessons created by this instructor
    lessons = Lesson.query.filter_by(created_by=user_id).all()
    
    result = []
    for lesson in lessons:
        # Get files for this lesson
        files = LessonFile.query.filter_by(lesson_id=lesson.id).all()
        
        result.append({
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "week_number": lesson.week_number,
            "subject_id": lesson.subject_id,
            "block_id": lesson.block_id,
            "is_published": lesson.is_published,
            "created_at": lesson.created_at.isoformat(),
            "files": [{
                "id": f.id,
                "filename": f.original_filename,
                "file_type": f.file_type
            } for f in files]
        })
    
    return jsonify(result), 200

@app.route('/api/student/lessons', methods=['GET'])
@jwt_required()
def get_student_lessons():
    """Get lessons for student's enrolled classes"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'student':
        return jsonify({"error": "Students only"}), 403
    
    # Get blocks this student is enrolled in
    enrollments = db.session.query(student_blocks.c.block_id).filter_by(
        student_id=user_id
    ).all()
    block_ids = [e.block_id for e in enrollments]
    
    if not block_ids:
        return jsonify([]), 200
    
    # ✅ FIXED: Get subject_id from query params and filter by it
    subject_id = request.args.get('subject_id', type=int)
    if not subject_id:
        return jsonify([]), 200

    # Verify this subject is actually in one of the student's blocks
    subject_block_rows = db.session.query(block_subjects.c.block_id).filter_by(
        subject_id=subject_id
    ).all()
    subject_block_ids = [r.block_id for r in subject_block_rows]
    valid_block_ids = [bid for bid in block_ids if bid in subject_block_ids]

    if not valid_block_ids:
        return jsonify([]), 200

    # Get lessons filtered by subject_id AND valid blocks
    lessons = Lesson.query.filter(
        Lesson.is_published == True,
        Lesson.subject_id == subject_id,
        (Lesson.block_id.in_(valid_block_ids)) | (Lesson.block_id == None)
    ).order_by(Lesson.week_number, Lesson.created_at).all()
    
    result = []
    for lesson in lessons:
        # Get files for this lesson
        files = LessonFile.query.filter_by(lesson_id=lesson.id).all()
        
        result.append({
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "week_number": lesson.week_number,
            "block_id": lesson.block_id,
            "created_at": lesson.created_at.isoformat(),
            "files": [{
                "id": f.id,
                "filename": f.original_filename,
                "file_type": f.file_type,
                "storage_path": f.storage_path
            } for f in files]
        })
    
    return jsonify(result), 200

# ===== SUBMISSION ROUTES =====
@app.route('/api/submissions', methods=['POST'])
@jwt_required()
@rate_limit(max_calls=10, period=60)
def create_submission():
    """Submit code for grading — fair scoring with partial credit and floor XP"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student':
        return jsonify({"error": "Students only"}), 403

    data = request.get_json()
    if not all(k in data for k in ['problem_id', 'code', 'language']):
        return jsonify({"error": "Missing fields"}), 400

    prob = Problem.query.get_or_404(data['problem_id'])
    if not prob.is_published:
        return jsonify({"error": "Problem unavailable"}), 404

    # Deadline enforcement
    if prob.due_date and datetime.utcnow() > prob.due_date:
        return jsonify({
            "error": "Deadline passed",
            "message": f"This quest closed on {prob.due_date.strftime('%B %d, %Y at %I:%M %p UTC')}",
            "due_date": prob.due_date.isoformat()
        }), 403

    # ✅ Block resubmission — any prior submission locks this problem
    prior = Submission.query.filter_by(
        user_id=user_id,
        problem_id=prob.id
    ).first()
    if prior:
        return jsonify({
            "error": "Already submitted",
            "message": "You have already submitted this problem. Use Run to test your code.",
            "submission_id": prior.id,
            "status": prior.status,
            "score": prior.score
        }), 409

    # XP floor table — 10% of xp_reward, minimum guaranteed even on errors
    floor_xp = max(5, int(prob.xp_reward * 0.10))

    sub = Submission(
        user_id=user.id,
        problem_id=prob.id,
        code=data['code'],
        language=data['language'],
        status='error',
        score=0
    )
    db.session.add(sub)
    db.session.flush()

    try:
        results     = evaluate_code(data['code'], prob.test_cases, data['language'])
        total       = len(results)
        passed      = sum(1 for r in results if r['passed'])
        has_timeout = any('Timeout' in r.get('output', '') for r in results)
        has_error   = any(
            r.get('message', '') not in ('Passed', '') and not r['passed']
            for r in results
        )

        # Determine status and score
        if total == 0:
            sub.status = 'error'
            sub.score  = 0

        elif passed == total:
            sub.status = 'accepted'
            sub.score  = prob.xp_reward

        elif has_timeout:
            sub.status = 'timeout'
            sub.score  = floor_xp

        elif passed == 0 and has_error:
            sub.status = 'error'
            sub.score  = floor_xp

        elif passed == 0:
            sub.status = 'wrong_answer'
            sub.score  = floor_xp

        else:
            # Partial: some passed, some failed
            partial_m  = (prob.partial_credit or 100) / 100.0
            sub.status = 'partial'
            sub.score  = max(floor_xp, int(prob.xp_reward * (passed / total) * partial_m))

        sub.passed_cases = passed
        sub.total_cases  = total

        # XP delta — only award improvement over student's previous best
        best_prev = (Submission.query
                     .filter_by(user_id=user_id, problem_id=prob.id)
                     .filter(Submission.id != sub.id)
                     .order_by(Submission.score.desc())
                     .first())
        prev_best_score = best_prev.score if best_prev else 0
        xp_delta = max(0, sub.score - prev_best_score)

        if xp_delta > 0:
            user.xp   += xp_delta
            user.level = 1 + (user.xp // 100)

        db.session.commit()

        return jsonify({
            "submission_id": sub.id,
            "status":        sub.status,
            "score":         sub.score,
            "passed_cases":  passed,
            "total_cases":   total,
            "xp_earned":     xp_delta,
            "test_results":  results,
            "user_xp":       user.xp,
            "user_level":    user.level,
            "scoring_note": (
                f"All {total} test cases passed. Full XP awarded." if sub.status == 'accepted'
                else f"{passed}/{total} test cases passed. {sub.score} XP awarded." if sub.status == 'partial'
                else f"Participation credit awarded: {sub.score} XP."
            )
        }), 201

    except Exception as e:
        db.session.rollback()
        sub.status = 'error'
        sub.score  = floor_xp
        db.session.commit()
        return jsonify({"error": str(e), "xp_earned": floor_xp}), 500

@app.route('/api/problems/<int:problem_id>/my-submission', methods=['GET'])
@jwt_required()
def get_my_submission(problem_id):
    """Check if current student has already submitted this problem"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student':
        return jsonify({"has_submitted": False}), 200

    sub = Submission.query.filter_by(
        user_id=user_id,
        problem_id=problem_id
    ).order_by(Submission.submitted_at.desc()).first()

    if not sub:
        return jsonify({"has_submitted": False}), 200

    return jsonify({
        "has_submitted": True,
        "status": sub.status,
        "score": sub.score,
        "passed_cases": sub.passed_cases,
        "total_cases": sub.total_cases,
        "submitted_at": sub.submitted_at.isoformat(),
        "language": sub.language
    }), 200

@app.route('/api/problems/<int:problem_id>/run', methods=['POST'])
@jwt_required()
@rate_limit(max_calls=20, period=60)
def run_problem_code(problem_id):
    """Students run code against test cases without submitting (no XP, no lock)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    data = request.get_json()
    if not all(k in data for k in ['code', 'language']):
        return jsonify({"error": "Missing code or language"}), 400

    prob = Problem.query.get_or_404(problem_id)
    if not prob.is_published:
        return jsonify({"error": "Problem not available"}), 404

    try:
        results = evaluate_code(data['code'], prob.test_cases, data['language'])
        passed = sum(1 for r in results if r['passed'])
        total = len(results)

        return jsonify({
            "message": "Run mode — no submission recorded",
            "test_results": results,
            "passed": passed,
            "total": total,
            "is_run_mode": True,
            "success_rate": round((passed / total * 100), 1) if total > 0 else 0
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/problems/<int:problem_id>/test', methods=['POST'])
@jwt_required()
def test_problem_code(problem_id):
    """Instructors can test code without submitting (no XP, no submission recorded)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Instructors and admins only"}), 403
    
    data = request.get_json()
    if not all(k in data for k in ['code', 'language']):
        return jsonify({"error": "Missing code or language"}), 400
    
    prob = Problem.query.get_or_404(problem_id)
    if not prob.is_published:
        return jsonify({"error": "Problem not available"}), 404
    
    # Run the code against test cases
    try:
        results = evaluate_code(data['code'], prob.test_cases, data['language'])
        
        passed = sum(1 for r in results if r['passed'])
        total = len(results)
        
        return jsonify({
            "message": "Test mode - no submission recorded",
            "test_results": results,
            "passed": passed,
            "total": total,
            "success_rate": round((passed/total*100), 1) if total > 0 else 0
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/submissions', methods=['GET'])
@jwt_required()
def get_student_submissions():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 15, type=int), 50)
    
    total = Submission.query.filter_by(user_id=user_id).count()
    subs = Submission.query.filter_by(user_id=user_id)\
        .order_by(Submission.submitted_at.desc())\
        .limit(limit).offset((page-1)*limit).all()
    
    return jsonify({
        "submissions": [{
            "id": s.id, 
            "problem_id": s.problem_id, 
            "problem_title": Problem.query.get(s.problem_id).title if Problem.query.get(s.problem_id) else "Unknown", 
            "status": s.status, 
            "score": s.score, 
            "language": s.language, 
            "submitted_at": s.submitted_at.isoformat()
        } for s in subs], 
        "total": total, 
        "page": page, 
        "pages": max(1, (total + limit - 1) // limit)
    }), 200

@app.route('/api/student/stats', methods=['GET'])
@jwt_required()
def get_student_stats():
    """Get student's gamification stats for dashboard"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student': 
        return jsonify({"error": "Students only"}), 403
    
    subs = Submission.query.filter_by(user_id=user.id).all()
    accepted = len([s for s in subs if s.status == 'accepted'])
    
    # Better mock streak: count consecutive days with submissions
    streak = 0
    if subs:
        # Sort by date
        sorted_subs = sorted(subs, key=lambda x: x.submitted_at, reverse=True)
        last_date = sorted_subs[0].submitted_at.date()
        streak = 1
        for i in range(1, len(sorted_subs)):
            curr_date = sorted_subs[i].submitted_at.date()
            if (last_date - curr_date).days == 1:
                streak += 1
                last_date = curr_date
            elif (last_date - curr_date).days > 1:
                break
        streak = min(streak, 30)  # Cap at 30 for demo
    
    return jsonify({
        "total_xp": user.xp, 
        "level": user.level, 
        "total_submissions": len(subs), 
        "accepted_submissions": accepted, 
        "success_rate": round((accepted/len(subs)*100), 1) if subs else 0.0, 
        "streak": streak,
        "last_submission": subs[0].submitted_at.isoformat() if subs else None
    }), 200

@app.route('/api/student/achievements', methods=['GET'])
@jwt_required()
def get_student_achievements():
    """Get all student achievements with progress"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'student':
        return jsonify({"error": "Students only"}), 403
    
    # Calculate current user stats for progress tracking
    total_quests = Submission.query.filter_by(user_id=user_id, status='accepted').count()
    python_quests = Submission.query.filter_by(user_id=user_id, status='accepted', language='python').count()
    java_quests = Submission.query.filter_by(user_id=user_id, status='accepted', language='java').count()
    csharp_quests = Submission.query.filter_by(user_id=user_id, status='accepted', language='csharp').count()
    hard_quests = Submission.query.filter_by(user_id=user_id, status='accepted').join(Problem).filter(Problem.difficulty == 'Hard').count()
    debug_quests = Submission.query.filter_by(user_id=user_id, status='accepted').join(Problem).filter(Problem.problem_type == 'debugging').count()
    
    # Get already earned achievements
    earned = {ua.achievement_id: ua for ua in UserAchievement.query.filter_by(user_id=user_id).all()}
    
    result = []
    all_achievements = Achievement.query.filter_by(category='student').all()
    
    for ach in all_achievements:
        is_earned = ach.id in earned
        current_progress = 0
        
        # Calculate progress based on requirement type
        if ach.requirement_type == 'quest_count': 
            current_progress = total_quests
        elif ach.requirement_type == 'streak': 
            current_progress = user.xp // 100  # Mock: 100 XP = 1 "streak day"
        elif ach.requirement_type == 'python_count': 
            current_progress = python_quests
        elif ach.requirement_type == 'java_count': 
            current_progress = java_quests
        elif ach.requirement_type == 'csharp_count': 
            current_progress = csharp_quests
        elif ach.requirement_type == 'hard_count': 
            current_progress = hard_quests
        elif ach.requirement_type == 'debug_count': 
            current_progress = debug_quests
        # Add more types here as needed...
        
        # Auto-earn if requirements met (and not already earned)
        if not is_earned and current_progress >= ach.requirement_value:
            db.session.add(UserAchievement(
                user_id=user_id, 
                achievement_id=ach.id, 
                progress=current_progress
            ))
            user.xp += ach.xp_reward  # Award XP immediately
            is_earned = True
            
        result.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon,
            "xp_reward": ach.xp_reward,
            "is_earned": is_earned,
            "progress": min(current_progress, ach.requirement_value),  # Cap at max
            "max_progress": ach.requirement_value,
            "earned_at": earned[ach.id].earned_at.isoformat() if is_earned and ach.id in earned else None
        })
        
    db.session.commit()
    return jsonify(result), 200

@app.route('/api/instructor/achievements', methods=['GET'])
@jwt_required()
def get_instructor_achievements():
    """Get all instructor achievements with progress"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role not in ['instructor', 'super_admin']:
        return jsonify({"error": "Instructors only"}), 403
    
    # Calculate instructor stats
    lessons_created = Lesson.query.filter_by(created_by=user_id).count()
    problems_created = Problem.query.filter_by(created_by=user_id).count()
    
    # Get blocks this instructor teaches
    assignments = TeacherAssignment.query.filter_by(instructor_id=user_id).all()
    blocks_taught = len(set(a.block_id for a in assignments))
    subjects_taught = len(set(a.subject_id for a in assignments))
    
    # Count students taught
    student_blocks_list = [a.block_id for a in assignments]
    students_taught = 0
    if student_blocks_list:
        students_taught = db.session.query(student_blocks.c.student_id).filter(
            student_blocks.c.block_id.in_(student_blocks_list)
        ).distinct().count()
    
    # Count files uploaded to lessons
    files_uploaded = db.session.query(LessonFile.id).join(Lesson).filter(
        Lesson.created_by == user_id
    ).count()
    
    # Get already earned achievements
    earned = {ua.achievement_id: ua for ua in UserAchievement.query.filter_by(user_id=user_id).all()}
    
    result = []
    all_achievements = Achievement.query.filter_by(category='instructor').all()
    
    for ach in all_achievements:
        is_earned = ach.id in earned
        current_progress = 0
        
        # Calculate progress based on requirement type
        if ach.requirement_type == 'lesson_count':
            current_progress = lessons_created
        elif ach.requirement_type == 'problem_count':
            current_progress = problems_created
        elif ach.requirement_type == 'blocks_taught':
            current_progress = blocks_taught
        elif ach.requirement_type == 'subjects_taught':
            current_progress = subjects_taught
        elif ach.requirement_type == 'students_taught':
            current_progress = students_taught
        elif ach.requirement_type == 'file_count':
            current_progress = files_uploaded
        elif ach.requirement_type == 'student_quest':
            # Count students who completed at least one quest in instructor's blocks
            if student_blocks_list:
                current_progress = db.session.query(Submission.user_id).join(Problem).filter(
                    Problem.created_by == user_id,
                    Submission.status == 'accepted'
                ).distinct().count()
        # Add more types as needed...
        
        # Auto-earn if requirements met (and not already earned)
        if not is_earned and current_progress >= ach.requirement_value:
            db.session.add(UserAchievement(
                user_id=user_id,
                achievement_id=ach.id,
                progress=current_progress
            ))
            user.xp += ach.xp_reward
            is_earned = True
        
        result.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon,
            "xp_reward": ach.xp_reward,
            "is_earned": is_earned,
            "progress": min(current_progress, ach.requirement_value),
            "max_progress": ach.requirement_value,
            "earned_at": earned[ach.id].earned_at.isoformat() if is_earned and ach.id in earned else None
        })
    
    db.session.commit()
    return jsonify(result), 200

# ===== STUDENT BLOCK/SUBJECT ROUTES =====
@app.route('/api/student/subjects', methods=['GET'])
@jwt_required()
def get_student_subjects():
    """Get all subjects this student is enrolled in — single optimized JOIN query"""
    user_id = int(get_jwt_identity())

    results = db.session.query(
        Subject.id,
        Subject.name,
        Block.id.label('block_id'),
        Block.section_code,
        Block.semester,
        User.username.label('instructor_name')
    ).join(
        block_subjects, Subject.id == block_subjects.c.subject_id
    ).join(
        Block, Block.id == block_subjects.c.block_id
    ).join(
        student_blocks,
        (student_blocks.c.block_id == Block.id) &
        (student_blocks.c.student_id == user_id)
    ).outerjoin(
        User, User.id == Block.instructor_id
    ).all()

    return jsonify([{
        "id": r.id,
        "name": r.name,
        "block_id": r.block_id,
        "block_code": r.section_code,
        "semester": r.semester,
        "instructor": r.instructor_name or "TBA"
    } for r in results]), 200

@app.route('/api/student/submissions/by-block', methods=['GET'])
@jwt_required()
def get_submissions_by_block():
    """Get submissions filtered by specific block/subject"""
    user_id = int(get_jwt_identity())
    block_id = request.args.get('block_id', type=int)
    
    if not block_id:
        return jsonify({"error": "block_id query parameter required"}), 400
    
    # ✅ Verify student is enrolled in this block (NEW TABLE)
    enrollment = db.session.query(student_blocks.c.student_id).filter(
        student_blocks.c.student_id == user_id,
        student_blocks.c.block_id == block_id
    ).first()
    
    if not enrollment:
        return jsonify({"error": "Not enrolled in this block"}), 403
    
    # ✅ Get problem IDs assigned to this block (NEW TABLE)
    problem_rows = db.session.query(block_problems.c.problem_id).filter_by(
        block_id=block_id
    ).all()
    problem_ids = [p[0] for p in problem_rows]
    
    # If no problems in block, return empty
    if not problem_ids:
        return jsonify({"submissions": []}), 200
    
    # Get submissions for these problems by this student
    subs = Submission.query.filter(
        Submission.user_id == user_id,
        Submission.problem_id.in_(problem_ids)
    ).order_by(Submission.submitted_at.desc()).all()
    
    return jsonify({
        "submissions": [{
            "id": s.id,
            "problem_id": s.problem_id,
            "problem_title": Problem.query.get(s.problem_id).title if Problem.query.get(s.problem_id) else "Unknown",
            "status": s.status,
            "score": s.score,
            "language": s.language,
            "submitted_at": s.submitted_at.isoformat()
        } for s in subs]
    }), 200

# ===== LEADERBOARD =====
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    block_id = request.args.get('block_id', type=int)  # ✅ changed param name
    
    if block_id:
        # ✅ Get students in specific block (NEW TABLE)
        student_rows = db.session.query(student_blocks.c.student_id).filter_by(block_id=block_id).all()
        student_ids = [s[0] for s in student_rows]
        if student_ids:
            students = User.query.filter(
                User.id.in_(student_ids), 
                User.role == 'student'
            ).order_by(User.xp.desc()).limit(20).all()
        else:
            students = []
    else:
        # Global leaderboard
        students = User.query.filter_by(role='student').order_by(User.xp.desc()).limit(20).all()
    
    return jsonify([{
        "id": s.id,
        "rank": i+1,
        "username": s.username,
        "full_name": s.full_name or s.username,
        "xp": s.xp,
        "level": s.level
    } for i, s in enumerate(students)]), 200

# ===== INSTRUCTOR ROUTES =====
@app.route('/api/instructor/problems', methods=['GET'])
@jwt_required()
def get_instructor_problems():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): 
        return jsonify({"error": "Unauthorized"}), 403
    
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
        "due_date": p.due_date.isoformat() if p.due_date else None,
        "created_at": p.created_at.isoformat()
    } for p in problems]), 200

@app.route('/api/instructor/classes/<int:class_id>/problems', methods=['GET'])
@jwt_required()
def get_class_problems(class_id):
    """Problems scoped to a specific block — only shows problems visible to that block."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403

    if user.role != 'super_admin':
        assignment = TeacherAssignment.query.filter_by(
            instructor_id=user_id,
            block_id=class_id
        ).first()
        if not assignment:
            return jsonify({"error": "Not assigned to this block"}), 403

    problems = Problem.query.filter_by(created_by=user_id).all()

    instructor_subject_ids_in_block = [
        a.subject_id for a in TeacherAssignment.query.filter_by(
            instructor_id=user_id,
            block_id=class_id
        ).all()
    ]

    result = []
    for p in problems:
        in_scope = False
        if p.visible_to_blocks:
            if class_id in p.visible_to_blocks:
                in_scope = True
        else:
            if p.subject_id in instructor_subject_ids_in_block:
                in_scope = True

        if not in_scope:
            continue

        result.append({
            "id": p.id,
            "title": p.title,
            "difficulty": p.difficulty,
            "is_published": p.is_published,
            "xp_reward": p.xp_reward,
            "problem_type": p.problem_type,
            "languages": p.languages or ['python'],
            "tags": p.tags or [],
            "visible_to_blocks": p.visible_to_blocks or [],
            "due_date": p.due_date.isoformat() if p.due_date else None,
            "created_at": p.created_at.isoformat()
        })

    return jsonify(result), 200

@app.route('/api/instructor/problems/<int:problem_id>', methods=['GET'])
@jwt_required()
def get_instructor_problem_detail(problem_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): 
        return jsonify({"error": "Unauthorized"}), 403
    
    problem = Problem.query.get_or_404(problem_id)
    if problem.created_by != user_id and user.role != 'super_admin':
        return jsonify({"error": "Not your problem"}), 403
    
    # Parse starter_code
    starter = problem.starter_code
    if isinstance(starter, str):
        try:
            starter = json.loads(starter)
        except:
            starter = {}
    
    return jsonify({
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "category": problem.category,
        "xp_reward": problem.xp_reward,
        "test_cases": problem.test_cases,
        "starter_code": starter,
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
        "plagiarism_threshold": problem.plagiarism_threshold,
        "due_date": problem.due_date.isoformat() if problem.due_date else None
    }), 200

@app.route('/api/instructor/classes', methods=['GET'])
@jwt_required()
def get_instructor_classes():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get blocks from TeacherAssignment table
    assignments = TeacherAssignment.query.filter_by(instructor_id=user_id).all()
    block_ids = list(set(a.block_id for a in assignments))
    
    if not block_ids:
        return jsonify([]), 200
    
    blocks = Block.query.filter(Block.id.in_(block_ids)).all()
    result = []
    
    for b in blocks:
        # ✅ Get ONLY subjects THIS instructor teaches in this block
        my_subject_ids = [a.subject_id for a in assignments if a.block_id == b.id]
        subjects = [Subject.query.get(sid).name for sid in my_subject_ids if Subject.query.get(sid)]
        
        student_count = db.session.query(student_blocks.c.student_id).filter_by(block_id=b.id).count()
        problem_count = db.session.query(block_problems.c.problem_id).filter_by(block_id=b.id).count()
        
        lesson_count = 0
        if my_subject_ids:
            lesson_count = Lesson.query.filter(
                Lesson.subject_id.in_(my_subject_ids),
                (Lesson.block_id == b.id) | (Lesson.block_id == None)
            ).count()
        
        announcement_count = Announcement.query.filter_by(class_id=b.id).count()
        
        result.append({
            "id": b.id,
            "section_code": b.section_code,
            "name": ', '.join(subjects) if subjects else b.section_code,
            "subjects": subjects,
            "semester": b.semester,
            "student_count": student_count,
            "problem_count": problem_count,
            "lesson_count": lesson_count,
            "announcement_count": announcement_count
        })
    
    return jsonify(result), 200

@app.route('/api/instructor/classes/<int:classId>', methods=['GET'])
@jwt_required()
def get_instructor_class_detail(classId):  # ✅ must match route parameter name
    """Get detailed information about a specific class/block"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get block details
    block = Block.query.get_or_404(classId)
    
    # Verify instructor has access to this block
    assignments = TeacherAssignment.query.filter_by(
        instructor_id=user_id, 
        block_id=classId
    ).all()
    
    if not assignments and user.role != 'super_admin':
        return jsonify({"error": "Not authorized to view this class"}), 403
    
    # ✅ FIX: Only get subjects THIS instructor teaches in this block
    my_subject_ids = [a.subject_id for a in assignments]
    subjects = [Subject.query.get(sid).name for sid in my_subject_ids if Subject.query.get(sid)]
    
    # Count students
    student_count = db.session.query(student_blocks.c.student_id).filter_by(
        block_id=classId
    ).count()
    
    # Count problems assigned to this block
    problem_count = db.session.query(block_problems.c.problem_id).filter_by(
        block_id=classId
    ).count()
    
    # Count lessons (if subject exists)
    lesson_count = 0
    if my_subject_ids:
        lesson_count = Lesson.query.filter(
            Lesson.subject_id.in_(my_subject_ids),
            (Lesson.block_id == classId) | (Lesson.block_id == None)
        ).count()
    
    # Count announcements
    announcement_count = Announcement.query.filter_by(class_id=classId).count()
    
    return jsonify({
        "id": block.id,
        "section_code": block.section_code,
        "name": ', '.join(subjects) if subjects else block.section_code,  # or you can use subjects[0] if only one subject
        "semester": block.semester or 'Current Semester',
        "subjects": subjects,
        "student_count": student_count,
        "problem_count": problem_count,
        "lesson_count": lesson_count,
        "announcement_count": announcement_count
    }), 200

@app.route('/api/instructor/dashboard-stats', methods=['GET'])
@jwt_required()
def get_instructor_dashboard_stats():
    """Get instructor dashboard statistics"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get all blocks this instructor teaches
    assignments = TeacherAssignment.query.filter_by(instructor_id=user_id).all()
    block_ids = list(set(a.block_id for a in assignments))
    
    if not block_ids:
        return jsonify({
            "total_students": 0,
            "total_problems": 0,
            "avg_score": 0,
            "pending_reviews": 0,
            "new_problems_this_week": 0,
            "recent_activity": [],
            "top_performers": []
        }), 200
    
    # 1. Total students across all blocks
    student_rows = db.session.query(student_blocks.c.student_id).filter(
        student_blocks.c.block_id.in_(block_ids)
    ).distinct().all()
    total_students = len(student_rows)
    student_ids = [s[0] for s in student_rows]
    
    # 2. Total problems created by this instructor
    total_problems = Problem.query.filter_by(created_by=user_id, is_published=True).count()
    
    # 3. Average class score (from submissions)
    if student_ids:
        submissions = Submission.query.filter(
            Submission.user_id.in_(student_ids),
            Submission.problem_id.in_(
                db.session.query(Problem.id).filter(Problem.created_by == user_id)
            )
        ).all()
        
        if submissions:
            total_score = sum(s.score for s in submissions)
            max_possible = len(submissions) * 100  # Assuming max score is 100
            avg_score = round((total_score / max_possible) * 100) if max_possible > 0 else 0
        else:
            avg_score = 0
    else:
        avg_score = 0
    
    # 4. Pending reviews (submissions needing manual review)
    pending_reviews = Submission.query.filter(
        Submission.status == 'pending_review'
    ).count() if 'pending_review' in [col.name for col in Submission.__table__.columns] else 0
    
    # 5. New problems this week
    from datetime import datetime, timedelta
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    new_problems = Problem.query.filter(
        Problem.created_by == user_id,
        Problem.created_at >= one_week_ago
    ).count()
    
    # 6. Recent activity (last 10 submissions from students)
    recent_subs = Submission.query.filter(
        Submission.user_id.in_(student_ids) if student_ids else False
    ).order_by(Submission.submitted_at.desc()).limit(10).all()
    
    recent_activity = [{
        "id": s.id,
        "student": User.query.get(s.user_id).username if s.user_id else "Unknown",
        "problem": Problem.query.get(s.problem_id).title if s.problem_id else "Unknown",
        "status": s.status,
        "score": s.score,
        "submitted_at": s.submitted_at.isoformat()
    } for s in recent_subs]
    
    # 7. Top performers (top 5 students by XP)
    if student_ids:
        top_students = User.query.filter(
            User.id.in_(student_ids),
            User.role == 'student'
        ).order_by(User.xp.desc()).limit(5).all()
        
        top_performers = [{
            "id": s.id,
            "username": s.username,
            "xp": s.xp,
            "level": s.level
        } for s in top_students]
    else:
        top_performers = []
    
    return jsonify({
        "total_students": total_students,
        "total_problems": total_problems,
        "avg_score": avg_score,
        "pending_reviews": pending_reviews,
        "new_problems_this_week": new_problems,
        "recent_activity": recent_activity,
        "top_performers": top_performers
    }), 200

@app.route('/api/instructor/problems/<int:problem_id>/submissions', methods=['GET'])
@jwt_required()
def get_problem_submissions(problem_id):
    """Get all submissions for a specific problem (instructor view)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403

    problem = Problem.query.get_or_404(problem_id)

    if problem.created_by != user_id and not is_super_admin(user):
        return jsonify({"error": "Not your problem"}), 403

    submissions = Submission.query.filter_by(problem_id=problem_id)\
        .order_by(Submission.submitted_at.desc()).all()

    assignments = TeacherAssignment.query.filter_by(instructor_id=user_id).all()
    block_ids = list(set(a.block_id for a in assignments))

    enrolled_student_ids = []
    if block_ids:
        rows = db.session.query(student_blocks.c.student_id).filter(
            student_blocks.c.block_id.in_(block_ids)
        ).distinct().all()
        enrolled_student_ids = [r[0] for r in rows]

    sub_map = {}
    for s in submissions:
        if s.user_id not in sub_map:
            sub_map[s.user_id] = s

    result_students = []
    for student_id in enrolled_student_ids:
        student = User.query.get(student_id)
        if not student or student.role != 'student':
            continue
        sub = sub_map.get(student_id)
        result_students.append({
            "id": student.id,
            "username": student.username,
            "full_name": student.full_name or student.username,
            "email": student.email,
            "submitted": sub is not None,
            "score": sub.score if sub else 0,
            "status": sub.status if sub else "Not Submitted",
            "submitted_at": sub.submitted_at.isoformat() if sub else None,
            "submission_id": sub.id if sub else None,
            "language": sub.language if sub else None,
        })

    for student_id, sub in sub_map.items():
        if student_id not in enrolled_student_ids:
            student = User.query.get(student_id)
            if student:
                result_students.append({
                    "id": student.id,
                    "username": student.username,
                    "full_name": student.full_name or student.username,
                    "email": student.email,
                    "submitted": True,
                    "score": sub.score,
                    "status": sub.status,
                    "submitted_at": sub.submitted_at.isoformat(),
                    "submission_id": sub.id,
                    "language": sub.language,
                })

    return jsonify({
        "students": result_students,
        "total": len(result_students),
        "submitted_count": sum(1 for s in result_students if s["submitted"]),
        "problem": {
            "id": problem.id,
            "title": problem.title,
            "difficulty": problem.difficulty,
            "xp_reward": problem.xp_reward
        }
    }), 200

@app.route('/api/instructor/submissions/<int:submission_id>/code', methods=['GET'])
@jwt_required()
def get_submission_code(submission_id):
    """Instructor views a student's submitted code + test results"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not is_instructor_or_admin(user):
        return jsonify({"error": "Unauthorized"}), 403

    sub = Submission.query.get_or_404(submission_id)
    problem = Problem.query.get_or_404(sub.problem_id)

    # Verify instructor owns this problem OR is super_admin
    if problem.created_by != user_id and user.role != 'super_admin':
        return jsonify({"error": "Not your problem"}), 403

    student = User.query.get(sub.user_id)

    # Re-run test cases against submitted code to get per-test breakdown
    try:
        test_results = evaluate_code(sub.code, problem.test_cases, sub.language)
    except Exception:
        test_results = []

    return jsonify({
        "submission_id": sub.id,
        "student": {
            "id": student.id,
            "username": student.username
        } if student else None,
        "problem": {
            "id": problem.id,
            "title": problem.title,
            "difficulty": problem.difficulty
        },
        "code": sub.code,
        "language": sub.language,
        "status": sub.status,
        "score": sub.score,
        "submitted_at": sub.submitted_at.isoformat(),
        "test_results": test_results
    }), 200

@app.route('/api/instructor/assigned-subjects', methods=['GET'])
@jwt_required()
def get_instructor_assigned_subjects():
    """Get unique subjects this instructor is assigned to teach"""
    user_id = int(get_jwt_identity())
    
    # Get all teacher assignments for this instructor
    assignments = TeacherAssignment.query.filter_by(instructor_id=user_id).all()
    
    # Extract unique subject IDs
    subject_ids = list(set(a.subject_id for a in assignments))
    
    # Fetch subject details
    subjects = Subject.query.filter(Subject.id.in_(subject_ids)).all() if subject_ids else []
    
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "description": s.description
    } for s in subjects]), 200

@app.route('/api/instructor/blocks-by-subject', methods=['GET'])
@jwt_required()
def get_blocks_by_subject():
    """Get blocks where instructor teaches a specific subject"""
    user_id = int(get_jwt_identity())
    subject_id = request.args.get('subject_id', type=int)
    
    if not subject_id:
        return jsonify({"error": "subject_id required"}), 400
    
    assignments = TeacherAssignment.query.filter_by(
        instructor_id=user_id, 
        subject_id=subject_id
    ).all()
    block_ids = [a.block_id for a in assignments]
    
    blocks = Block.query.filter(Block.id.in_(block_ids)).all()
    return jsonify([{
        "id": b.id,
        "section_code": b.section_code,
        "semester": b.semester or 'Current'
    } for b in blocks]), 200

@app.route('/api/instructor/class/<int:class_id>/stats', methods=['GET'])
@jwt_required()
def get_class_stats(class_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): 
        return jsonify({"error": "Unauthorized"}), 403
    
    c = Class.query.get_or_404(class_id)
    if c.instructor_id != user.id and user.role != 'super_admin': 
        return jsonify({"error": "Not your class"}), 403
    
    student_ids = [cs.student_id for cs in db.session.query(class_students.c.student_id).filter_by(class_id=class_id).all()]
    problem_ids = [cp.problem_id for cp in db.session.query(class_problems.c.problem_id).filter_by(class_id=class_id).all()]
    
    if student_ids and problem_ids:
        subs = Submission.query.filter(
            Submission.user_id.in_(student_ids), 
            Submission.problem_id.in_(problem_ids)
        ).all()
    else:
        subs = []
    
    accepted = len([s for s in subs if s.status == 'accepted'])
    total = len(subs)
    avg = round((accepted/total*100), 1) if total > 0 else 0.0
    recent = [{
        "student": User.query.get(s.user_id).username, 
        "problem": Problem.query.get(s.problem_id).title, 
        "status": s.status, 
        "xp": s.score, 
        "submitted_at": s.submitted_at.isoformat()
    } for s in subs[-5:]]
    
    return jsonify({
        "total_problems": len(problem_ids), 
        "total_students": len(student_ids), 
        "avg_completion": avg, 
        "total_xp_awarded": sum(s.score for s in subs), 
        "recent_submissions": recent
    }), 200

# ===== ANNOUNCEMENTS =====
@app.route('/api/announcements', methods=['POST'])
@jwt_required()
def create_announcement():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not is_instructor_or_admin(user): 
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    if not data.get('title') or not data.get('content'): 
        return jsonify({"error": "Title & content required"}), 400
    
    a = Announcement(
        instructor_id=user.id, 
        class_id=data.get('class_id'), 
        title=data['title'], 
        content=data['content'], 
        is_pinned=data.get('is_pinned', False),
        priority=data.get('priority', 'medium')
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({"message": "Announcement created", "announcement_id": a.id}), 201

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    class_id = request.args.get('class_id', type=int)
    if class_id:
        q = Announcement.query.filter_by(class_id=class_id)
    else:
        q = Announcement.query.filter(Announcement.class_id == None)
    
    return jsonify([{
        "id": a.id, 
        "title": a.title, 
        "content": a.content, 
        "is_pinned": a.is_pinned,
        "priority": a.priority,
        "created_at": a.created_at.isoformat(), 
        "instructor": User.query.get(a.instructor_id).username if a.instructor_id else "System"
    } for a in q.order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc()).all()]), 200

# ✅ NEW: Student-specific announcements endpoint
@app.route('/api/student/announcements', methods=['GET'])
@jwt_required()
def get_student_announcements():
    """Get announcements for logged-in student's blocks"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'student':
        return jsonify({"error": "Students only"}), 403
    
    # Get blocks this student is in (NEW student_blocks table)
    block_rows = db.session.query(student_blocks.c.block_id).filter_by(student_id=user_id).all()
    block_ids = [b[0] for b in block_rows]
    
    # Fetch announcements: global OR for student's blocks
    announcements = Announcement.query.filter(
        (Announcement.class_id == None) | (Announcement.class_id.in_(block_ids))
    ).order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc()).all()
    
    return jsonify([{
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "is_pinned": a.is_pinned,
        "priority": a.priority,
        "created_at": a.created_at.isoformat(),
        "instructor": User.query.get(a.instructor_id).username if a.instructor_id else "System",
        "block_name": Class.query.get(a.class_id).name if a.class_id else "All Blocks"
    } for a in announcements]), 200

@app.route('/api/admin/dashboard-stats', methods=['GET'])
@admin_required
def admin_dashboard_stats(admin):
    """Get dashboard statistics for admin overview"""
    from sqlalchemy import func
    
    # Get counts
    total_students = User.query.filter_by(role='student', is_active=True).count()
    total_instructors = User.query.filter_by(role='instructor', is_active=True).count()
    total_blocks = Block.query.count()
    total_subjects = Subject.query.count()
    total_problems = Problem.query.count()
    total_submissions = Submission.query.count()
    
    # Get today's stats
    today = datetime.utcnow().date()
    today_logins = User.query.filter(
        User.role == 'student',
        func.date(User.created_at) == today
    ).count()
    
    today_submissions = Submission.query.filter(
        func.date(Submission.submitted_at) == today
    ).count()
    
    # Get recent activity (last 10 audit logs)
    recent_activity = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
    activity_list = [{
        "id": a.id,
        "action": a.action,
        "details": a.details,
        "created_at": a.created_at.isoformat(),
        "admin": User.query.get(a.admin_id).username if a.admin_id else "System"
    } for a in recent_activity]
    
    return jsonify({
        "total_students": total_students,
        "total_instructors": total_instructors,
        "total_blocks": total_blocks,
        "total_subjects": total_subjects,
        "total_problems": total_problems,
        "total_submissions": total_submissions,
        "today_logins": today_logins,
        "today_submissions": today_submissions,
        "recent_activity": activity_list
    }), 200

# ===== ADMIN ROUTES =====
@app.route('/api/admin/overview', methods=['GET'])
@admin_required
def admin_overview(admin):
    return jsonify({
        "total_users": User.query.count(),
        "active_students": User.query.filter_by(role='student', is_active=True).count(),
        "active_instructors": User.query.filter_by(role='instructor', is_active=True).count(),
        "total_submissions": Submission.query.count(),
        "today_submissions": Submission.query.filter(Submission.submitted_at >= datetime.utcnow() - timedelta(days=1)).count(),
        "maintenance_mode": (SystemConfig.query.filter_by(key='maintenance_mode').first() or type('obj', (object,), {'value': 'false'})).value == 'true',
        "server_time": datetime.utcnow().isoformat()
    }), 200

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def admin_create_user(admin):
    data = request.get_json()
    required = ['username', 'email', 'password', 'role']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    if data['role'] not in ['student', 'instructor', 'super_admin']:
        return jsonify({"error": "Invalid role"}), 400
    if not data['email'].lower().endswith('@adamson.edu.ph'):
        return jsonify({"error": "Only Adamson University email addresses (@adamson.edu.ph) are allowed."}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Username already exists"}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already exists"}), 400
    new_user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=data['role'],
        is_active=True,
        xp=0, level=1
    )
    db.session.add(new_user)
    db.session.flush()
    if data.get('block_id') and data['role'] == 'student':
        block = Block.query.get(int(data['block_id']))
        if block:
            db.session.execute(student_blocks.insert().values(
                student_id=new_user.id,
                block_id=int(data['block_id'])
            ))
    db.session.commit()
    log_admin_action(admin.id, "USER_CREATED",
        f"Created {data['role']} account: {data['username']} ({data['email']})",
        target_id=new_user.id)
    return jsonify({
        "message": "User created successfully",
        "user": {"id": new_user.id, "username": new_user.username,
                 "email": new_user.email, "role": new_user.role}
    }), 201

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users(admin):
    role = request.args.get('role')
    search = request.args.get('search', '').lower()
    status = request.args.get('status')
    
    q = User.query
    if role and role != 'all': q = q.filter_by(role=role)
    if status == 'active': q = q.filter_by(is_active=True)
    elif status == 'inactive': q = q.filter_by(is_active=False)
    if search: q = q.filter((User.username.ilike(f'%{search}%')) | (User.email.ilike(f'%{search}%')) | (User.full_name.ilike(f'%{search}%')))
    
    users = q.order_by(User.created_at.desc()).limit(500).all()
    
    result = []
    for u in users:
        blocks_list = []
        block_id, block_name = None, None
        
        if u.role == 'student':
            # Get ALL blocks this student is enrolled in (NEW TABLE)
            enrollments = db.session.query(student_blocks.c.block_id).filter_by(student_id=u.id).all()
            block_ids = [e.block_id for e in enrollments]
            
            if block_ids:
                all_blocks = Block.query.filter(Block.id.in_(block_ids)).all()
                for b in all_blocks:
                    # Get subjects linked to this block
                    subj_ids = [s.subject_id for s in db.session.query(block_subjects.c.subject_id).filter_by(block_id=b.id).all()]
                    subjects = [Subject.query.get(sid).name for sid in subj_ids if Subject.query.get(sid)]
                    
                    blocks_list.append({
                        "id": b.id, 
                        "section_code": b.section_code, 
                        "name": b.section_code,
                        "semester": b.semester,
                        "subjects": subjects
                    })
                
                if all_blocks:
                    block_id = all_blocks[0].id
                    block_name = all_blocks[0].section_code
        
        elif u.role == 'instructor':
            # ✅ Get blocks this instructor teaches
            instructor_blocks = Block.query.filter_by(instructor_id=u.id).all()
            for b in instructor_blocks:
                # Get subjects linked to this block
                subj_ids = [s.subject_id for s in db.session.query(block_subjects.c.subject_id).filter_by(block_id=b.id).all()]
                subjects = [Subject.query.get(sid).name for sid in subj_ids if Subject.query.get(sid)]
                
                blocks_list.append({
                    "id": b.id, 
                    "section_code": b.section_code, 
                    "name": b.section_code,
                    "semester": b.semester,
                    "subjects": subjects
                })
            
            # Fallback for backward compatibility
            if instructor_blocks:
                block_id = instructor_blocks[0].id
                block_name = instructor_blocks[0].section_code
        
        # Check if student has irregular enrollments
        is_irregular = False
        if u.role == 'student' and not blocks_list:
            irr_count = IrregularEnrollment.query.filter_by(student_id=u.id).count()
            is_irregular = irr_count > 0

        result.append({
            "id": u.id, "username": u.username, "email": u.email, "role": u.role,
            "full_name": getattr(u, 'full_name', None) or None,
            "xp": u.xp, "level": u.level, "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "block_id": block_id, "block_name": block_name,
            "blocks": blocks_list,
            "is_irregular": is_irregular,
            "login_attempts": u.login_attempts or 0,
            "locked_until": u.locked_until.isoformat() if u.locked_until else None,
            "is_locked": bool(u.locked_until and u.locked_until > datetime.utcnow())
        })
    return jsonify(result), 200

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def admin_update_user(admin, user_id):
    target = User.query.get_or_404(user_id)
    if target.id == admin.id: 
        return jsonify({"error": "Cannot modify own account"}), 400
    
    data = request.get_json()
    changes = []
    
    if 'role' in data and data['role'] in ['student','instructor','super_admin']:
        if target.role != data['role']: changes.append(f"Role: {target.role} -> {data['role']}")
        target.role = data['role']
    if 'is_active' in data:  # ✅ FIXED: was missing 'data:'
        if target.is_active != data['is_active']: 
            changes.append(f"Status: {'Active' if target.is_active else 'Inactive'} -> {'Active' if data['is_active'] else 'Inactive'}")
        target.is_active = data['is_active']
    if 'xp' in data: target.xp = int(data['xp'])  # ✅ FIXED
    if 'level' in data: target.level = int(data['level'])  # ✅ FIXED
    
    # ✅ updated: accept 'block_ids' as a list for multi-class enrollment
    if 'block_ids' in data:
        block_ids = data['block_ids']  # expected format: [1, 5, 8]
        if target.role == 'student':
            # 1. remove all old block assignments for this student (NEW TABLE)
            db.session.query(student_blocks).filter_by(student_id=user_id).delete()
            
            # 2. add the new assignments from the list
            if block_ids:
                # create list of dictionaries for bulk insert
                insert_data = [{'block_id': int(bid), 'student_id': user_id} for bid in block_ids]
                db.session.execute(student_blocks.insert(), insert_data)
                changes.append(f"Assigned to {len(block_ids)} blocks")
            else:
                changes.append("Unassigned from block")
        elif target.role == 'instructor':
            # ✅ Use NEW Block model and handle block_ids list
            if block_ids:
                # Unassign instructor from all old blocks
                Block.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
                # Assign to first block in the list (instructors typically teach one block)
                Block.query.filter_by(id=block_ids[0]).update({'instructor_id': user_id})
                changes.append(f"Assigned as Instructor to Block {block_ids[0]}")
            else:
                Block.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
                changes.append("Unassigned as instructor")
    
    db.session.commit()
    log_admin_action(admin.id, "USER_UPDATED", f"Target: {target.username}. Changes: {', '.join(changes) if changes else 'None'}", target_id=user_id)
    return jsonify({"message": "User updated", "changes": changes}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(admin, user_id):
    if user_id == admin.id: 
        return jsonify({"error": "Cannot delete own account"}), 400
    target = User.query.get_or_404(user_id)
    
    # ✅ Use NEW student_blocks table
    db.session.query(student_blocks).filter_by(student_id=user_id).delete()
    # ✅ Use NEW Block table
    Block.query.filter_by(instructor_id=user_id).update({'instructor_id': None})
    db.session.delete(target)
    db.session.commit()
    
    log_admin_action(admin.id, "USER_DELETED", f"Deleted user {target.username} (ID: {user_id})")
    return jsonify({"message": "User deleted"}), 200

@app.route('/api/admin/users/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def admin_reset_password(admin, user_id):
    target = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data.get('new_password'):
        return jsonify({"error": "New password required"}), 400
    target.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()
    log_admin_action(admin.id, "PASSWORD_RESET", f"Reset password for {target.username}")
    return jsonify({"message": "Password reset successfully"}), 200

@app.route('/api/admin/users/<int:user_id>/unlock', methods=['POST'])
@admin_required
def admin_unlock_user(admin, user_id):
    target = User.query.get_or_404(user_id)
    target.login_attempts = 0
    target.locked_until = None
    db.session.commit()
    log_admin_action(admin.id, "USER_UNLOCKED", f"Unlocked account for {target.username}")
    return jsonify({"message": f"Account {target.username} has been unlocked."}), 200

@app.route('/api/admin/users/<int:user_id>/email', methods=['PUT'])
@admin_required
def admin_update_email(admin, user_id):
    return jsonify({"error": "Adamson email addresses are permanent and cannot be changed."}), 403

@app.route('/api/admin/config', methods=['GET'])
@admin_required
def admin_get_config(admin):
    configs = {c.key: c.value for c in SystemConfig.query.all()}
    defaults = {
        # General
        'system_name': 'Forge.dev',
        'institution_name': '',
        'timezone': 'Asia/Manila',
        # Security
        'maintenance_mode': 'false',
        'min_password_length': '8',
        'session_timeout': '60',
        'jwt_expiration_hours': '24',
        # Execution
        'execution_timeout': '5',
        'enabled_languages': 'python,java,csharp',
        'memory_limit_mb': '256',
        # Gamification
        'xp_multiplier': '1.0',
        'easy_xp_max': '100',
        'medium_xp_max': '250',
        'hard_xp_max': '500',
        # Plagiarism
        'plagiarism_threshold': '0.85',
        'plagiarism_auto_flag': 'true',
    }
    for k, v in defaults.items():
        configs.setdefault(k, v)
    return jsonify(configs), 200

@app.route('/api/admin/config', methods=['PUT'])
@admin_required
def admin_update_config(admin):
    data = request.get_json()
    allowed = {
        # General
        'system_name', 'institution_name', 'timezone',
        # Security
        'maintenance_mode', 'min_password_length', 'session_timeout', 'jwt_expiration_hours',
        # Execution
        'execution_timeout', 'enabled_languages', 'memory_limit_mb',
        # Gamification
        'xp_multiplier', 'easy_xp_max', 'medium_xp_max', 'hard_xp_max',
        # Plagiarism
        'plagiarism_threshold', 'plagiarism_auto_flag',
    }
    invalid_keys = [k for k in data.keys() if k not in allowed]
    if invalid_keys:
        return jsonify({"error": f"Invalid config keys: {', '.join(invalid_keys)}"}), 400
    changes = []
    for k, v in data.items():
        existing = SystemConfig.query.filter_by(key=k).first()
        old_val = existing.value if existing else "N/A"
        if existing:
            existing.value = str(v)
        else:
            db.session.add(SystemConfig(key=k, value=str(v)))
        changes.append(f"{k}: {old_val} -> {v}")
    db.session.commit()
    log_admin_action(admin.id, "CONFIG_UPDATED", f"Changes: {', '.join(changes)}")
    return jsonify({"message": "Config updated", "changes": changes}), 200

@app.route('/api/admin/audit-logs', methods=['GET'])
@admin_required
def admin_get_logs(admin):
    search = request.args.get('search', '')
    action_filter = request.args.get('action', '')
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 20, type=int), 200)

    q = AuditLog.query
    if action_filter and action_filter != 'all':
        q = q.filter(AuditLog.action == action_filter)
    if search:
        q = q.filter(
            (AuditLog.action.ilike(f'%{search}%')) |
            (AuditLog.details.ilike(f'%{search}%')) |
            (AuditLog.ip_address.ilike(f'%{search}%'))
        )

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page-1)*limit).limit(limit).all()

    today = datetime.utcnow().date()
    today_count = AuditLog.query.filter(db.func.date(AuditLog.created_at) == today).count()
    unique_users = db.session.query(AuditLog.admin_id).distinct().count()
    last_log = AuditLog.query.order_by(AuditLog.created_at.desc()).first()

    return jsonify({
        "logs": [{
            "id": l.id,
            "admin": User.query.get(l.admin_id).username if l.admin_id else "System",
            "action": l.action,
            "details": l.details,
            "ip": l.ip_address,
            "created_at": l.created_at.isoformat()
        } for l in logs],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
        "stats": {
            "total": AuditLog.query.count(),
            "today": today_count,
            "unique_users": unique_users,
            "last_activity": last_log.created_at.isoformat() if last_log else None
        }
    }), 200

@app.route('/api/admin/audit-logs/clear', methods=['DELETE'])
@admin_required
def admin_clear_logs(admin):
    cutoff = datetime.utcnow() - timedelta(days=30)
    deleted = AuditLog.query.filter(AuditLog.created_at < cutoff).delete()
    db.session.commit()
    log_admin_action(admin.id, "LOGS_CLEARED", f"Cleared {deleted} logs older than 30 days")
    return jsonify({"message": f"Cleared {deleted} old logs"}), 200

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
        return app.response_class(si.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=submissions_report.csv"})
    
    return jsonify({"error": "Unsupported format"}), 400

# =====================================================================
# ADD THIS ROUTE TO app.py  (paste after admin_generate_report route)
# =====================================================================
#
# Also add these imports at the top of app.py if not already present:
#   import io, zipfile
#
# =====================================================================

@app.route('/api/admin/users/bulk-upload-csv', methods=['POST'])
@admin_required
def admin_bulk_upload_csv(admin):
    import io, csv, secrets, string, base64

    role_type = request.form.get('role_type', 'student')
    if role_type not in ('student', 'instructor'):
        return jsonify({"error": "role_type must be 'student' or 'instructor'"}), 400

    override_block_id = request.form.get('block_id', type=int)

    if 'file' not in request.files:
        return jsonify({"error": "No file provided — send field name 'file'"}), 400

    f = request.files['file']
    if not f.filename.lower().endswith('.csv'):
        return jsonify({"error": "Only .csv files are accepted"}), 400

    raw = f.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds 5 MB limit"}), 413

    try:
        text   = raw.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(text))
        rows   = list(reader)
    except Exception as e:
        return jsonify({"error": f"CSV parse error: {str(e)}"}), 400

    if not rows:
        return jsonify({"error": "CSV file is empty"}), 400
    if len(rows) > 1500:
        return jsonify({"error": "Maximum 1500 rows per upload"}), 400

    rows = [{k.strip().lower(): v.strip() for k, v in row.items()} for row in rows]

    headers  = set(rows[0].keys())
    required = {'username', 'email'}
    missing  = required - headers
    if missing:
        return jsonify({"error": "Missing columns", "missing": sorted(missing)}), 400

    def _gen_password():
        pool  = string.ascii_letters + string.digits + '!@#$%'
        chars = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.digits),
            secrets.choice('!@#$%'),
        ]
        chars += [secrets.choice(pool) for _ in range(9)]
        secrets.SystemRandom().shuffle(chars)
        return ''.join(chars)

    results       = []
    created_users = []
    errors_count  = 0
    skipped_count = 0

    all_blocks     = Block.query.all()
    block_code_map = {b.section_code.strip().lower(): b.id for b in all_blocks}
    block_id_set   = {b.id for b in all_blocks}
    seen_usernames = set()
    seen_emails    = set()

    try:
        for row_num, row in enumerate(rows, start=2):
            username = row.get('username', '').strip()
            email    = row.get('email',    '').strip().lower()
            row_errors = []

            if not username or len(username) < 2 or len(username) > 50:
                row_errors.append('username missing or invalid (2–50 chars)')
            if not email:
                row_errors.append('email required')
            elif not ('@' in email and '.' in email.split('@')[-1]):
                row_errors.append('invalid email format')
            elif len(email) > 120:
                row_errors.append('email too long')
            if username in seen_usernames:
                row_errors.append('duplicate username in CSV')
            if email in seen_emails:
                row_errors.append('duplicate email in CSV')

            if row_errors:
                results.append({'row': row_num, 'status': 'error', 'errors': row_errors})
                errors_count += 1
                continue

            seen_usernames.add(username)
            seen_emails.add(email)

            if User.query.filter_by(username=username).first():
                results.append({'row': row_num, 'status': 'skipped', 'email': email, 'reason': 'username_exists'})
                skipped_count += 1; continue

            if User.query.filter_by(email=email).first():
                results.append({'row': row_num, 'status': 'skipped', 'email': email, 'reason': 'email_exists'})
                skipped_count += 1; continue

            resolved_block_id = None
            if override_block_id:
                if override_block_id in block_id_set:
                    resolved_block_id = override_block_id
                else:
                    results.append({'row': row_num, 'status': 'error', 'email': email,
                                    'errors': [f'block_id {override_block_id} not found']})
                    errors_count += 1; continue
            else:
                csv_block_code = row.get('block_code', '').strip().lower()
                if csv_block_code:
                    resolved_block_id = block_code_map.get(csv_block_code)

            temp_pwd = _gen_password()
            new_user = User(
                username      = username,
                email         = email,
                password_hash = generate_password_hash(temp_pwd),
                role          = role_type,
                is_active     = True,
                xp            = 0,
                level         = 1,
            )
            db.session.add(new_user)
            db.session.flush()

            if resolved_block_id and role_type == 'student':
                already = db.session.query(student_blocks).filter_by(
                    student_id=new_user.id, block_id=resolved_block_id
                ).first()
                if not already:
                    db.session.execute(
                        student_blocks.insert().values(student_id=new_user.id, block_id=resolved_block_id)
                    )

            created_users.append({'row': row_num, 'username': username, 'email': email,
                                   'temp_password': temp_pwd, 'block_id': resolved_block_id})
            results.append({'row': row_num, 'status': 'created', 'email': email})

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Transaction rolled back", "detail": str(e), "results": results}), 500

    cred_buf = io.StringIO()
    writer   = csv.writer(cred_buf)
    writer.writerow(['username', 'email', 'temporary_password', 'block_id', 'must_change_password'])
    for u in created_users:
        writer.writerow([u['username'], u['email'], u['temp_password'], u['block_id'] or '', 'YES'])
    cred_b64 = base64.b64encode(cred_buf.getvalue().encode('utf-8')).decode('utf-8')

    log_admin_action(admin.id, 'BULK_CSV_UPLOAD',
        f"CSV upload ({role_type}): {len(created_users)} created, {skipped_count} skipped, {errors_count} errors from {len(rows)} rows.")

    return jsonify({
        "summary":        {"total_rows": len(rows), "created": len(created_users), "skipped": skipped_count, "errors": errors_count},
        "results":        results,
        "credential_csv": cred_b64,
    }), 207 if errors_count else 200


@app.route('/api/admin/backup', methods=['POST'])
@admin_required
def admin_backup_database(admin):
    """
    Trigger a database backup and return it as a downloadable SQL file.

    POST body (JSON, optional):
        { "tables": "all" }           ← full backup
        { "tables": ["users", ...] }  ← selective backup

    The route generates SQL INSERT statements from the live database and
    returns them as an attachment.  For production you would shell out
    to mysqldump and stream the result; this pure-Python implementation
    works without mysqldump and avoids extra OS dependencies.
    """
    import io

    data = request.get_json(silent=True) or {}
    tables_param = data.get('tables', 'all')

    # ── Resolve which models / table names to export ──────────────────
    ALL_MODELS = [
        ('users',               User),
        ('blocks',              Block),
        ('subjects',            Subject),
        ('problems',            Problem),
        ('submissions',         Submission),
        ('audit_logs',          AuditLog),
        ('achievements',        Achievement),
        ('teacher_assignments', TeacherAssignment),
        ('announcements',       Announcement),
        ('system_config',       SystemConfig),
    ]

    if tables_param == 'all':
        models_to_export = ALL_MODELS
    elif isinstance(tables_param, list):
        key_set = set(tables_param)
        models_to_export = [(tbl, mdl) for tbl, mdl in ALL_MODELS if tbl in key_set]
    else:
        models_to_export = ALL_MODELS

    # ── Build SQL dump ────────────────────────────────────────────────
    buf = io.StringIO()
    ts  = datetime.utcnow().isoformat()

    buf.write(f"-- Forge.dev Database Backup\n")
    buf.write(f"-- Generated : {ts} UTC\n")
    buf.write(f"-- Tables    : {', '.join(t for t, _ in models_to_export)}\n")
    buf.write(f"-- Admin     : {admin.username} (ID {admin.id})\n\n")
    buf.write("SET FOREIGN_KEY_CHECKS=0;\n\n")

    for table_name, model_cls in models_to_export:
        try:
            rows = db.session.query(model_cls).all()
            if not rows:
                buf.write(f"-- Table `{table_name}` is empty\n\n")
                continue

            # Introspect columns from the mapper
            columns = [c.key for c in model_cls.__mapper__.columns]

            buf.write(f"-- ── {table_name} ({len(rows)} rows) ──\n")
            buf.write(f"TRUNCATE TABLE `{table_name}`;\n")

            for row in rows:
                values = []
                for col in columns:
                    val = getattr(row, col, None)
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, bool):
                        values.append('1' if val else '0')
                    elif isinstance(val, (int, float)):
                        values.append(str(val))
                    elif isinstance(val, datetime):
                        values.append(f"'{val.isoformat()}'")
                    elif isinstance(val, (dict, list)):
                        import json as _json
                        safe = _json.dumps(val).replace("'", "\\'")
                        values.append(f"'{safe}'")
                    else:
                        safe = str(val).replace("\\", "\\\\").replace("'", "\\'")
                        values.append(f"'{safe}'")

                col_list = ', '.join(f'`{c}`' for c in columns)
                val_list = ', '.join(values)
                buf.write(f"INSERT INTO `{table_name}` ({col_list}) VALUES ({val_list});\n")

            buf.write("\n")
        except Exception as e:
            buf.write(f"-- ERROR exporting {table_name}: {e}\n\n")

    buf.write("SET FOREIGN_KEY_CHECKS=1;\n")
    buf.write(f"-- End of backup\n")

    sql_bytes = buf.getvalue().encode('utf-8')

    # ── Log the action ────────────────────────────────────────────────
    log_admin_action(
        admin.id,
        'DATABASE_BACKUP',
        f"Backup generated: {len(models_to_export)} tables, {len(sql_bytes)//1024} KB",
    )

    filename = f"forge_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.sql"

    return app.response_class(
        sql_bytes,
        mimetype='application/sql',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Length': str(len(sql_bytes)),
        }
    )


@app.route('/api/admin/subjects', methods=['POST'])
@admin_required
def admin_create_subject(admin):
    """Create a new subject with full university metadata."""
    data = request.get_json()

    # ── Basic validation ───────────────────────────────────────────────
    if not data or not data.get('name', '').strip():
        return jsonify({"error": "Subject name is required"}), 400

    name = data['name'].strip()
    if len(name) > 200:
        return jsonify({"error": "Subject name must be 200 characters or fewer"}), 400

    # ── subject_code: alphanumeric + hyphens only, no regex needed ────
    subject_code = data.get('subject_code', '').strip().upper() or None
    if subject_code:
        if len(subject_code) > 20:
            return jsonify({"error": "Subject code must be 20 characters or fewer"}), 400
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')
        if not all(ch in allowed_chars for ch in subject_code):
            return jsonify({"error": "Subject code may only contain letters, digits, hyphens, and underscores"}), 400

    # ── units ─────────────────────────────────────────────────────────
    units = data.get('units')
    if units is not None:
        try:
            units = int(units)
            if units < 1 or units > 12:
                return jsonify({"error": "Units must be between 1 and 12"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Units must be a valid integer"}), 400

    # ── year_level ────────────────────────────────────────────────────
    year_level = data.get('year_level')
    if year_level is not None:
        try:
            year_level = int(year_level)
            if year_level < 1 or year_level > 6:
                return jsonify({"error": "Year level must be between 1 and 6"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Year level must be a valid integer"}), 400

    # ── subject_type ──────────────────────────────────────────────────
    allowed_types = {'lab', 'lecture_lab', 'elective'}
    subject_type = data.get('subject_type', 'lab')
    if subject_type not in allowed_types:
        return jsonify({"error": f"subject_type must be one of: {', '.join(sorted(allowed_types))}. Note: 'lecture' type is no longer accepted for new subjects."}), 400

    # ── department ────────────────────────────────────────────────────
    department = data.get('department', '').strip() or None
    if department and len(department) > 100:
        return jsonify({"error": "Department must be 100 characters or fewer"}), 400

    # ── Duplicate check ───────────────────────────────────────────────
    existing = Subject.query.filter_by(name=name).first()
    if existing:
        return jsonify({"error": "A subject with this name already exists"}), 409

    # ── Persist ───────────────────────────────────────────────────────
    subject = Subject(
        name=name,
        description=data.get('description', '').strip() or None,
        subject_code=subject_code,
        units=units,
        department=department,
        year_level=year_level,
        subject_type=subject_type,
    )
    db.session.add(subject)
    db.session.commit()

    log_admin_action(
        admin.id,
        "SUBJECT_CREATED",
        f"Created subject: {subject.name}"
        + (f" [{subject.subject_code}]" if subject.subject_code else ""),
        target_id=subject.id,
    )

    return jsonify({
        "message": "Subject created successfully",
        "subject": {
            "id":           subject.id,
            "name":         subject.name,
            "description":  subject.description,
            "subject_code": subject.subject_code,
            "units":        subject.units,
            "department":   subject.department,
            "year_level":   subject.year_level,
            "subject_type": subject.subject_type,
        }
    }), 201

@app.route('/api/admin/subjects', methods=['GET'])
@admin_required
def admin_get_subjects(admin):
    """Get all unique subjects (for admin assignment forms)"""
    try:
        # Get all subjects
        subjects = Subject.query.all()
        
        # Remove duplicates in Python (keep first occurrence of each name)
        seen_names = set()
        unique_subjects = []
        for s in subjects:
            if s.name not in seen_names:
                seen_names.add(s.name)
                unique_subjects.append(s)
        
        return jsonify([{
            "id":           s.id,
            "name":         s.name,
            "description":  s.description,
            "subject_code": s.subject_code,
            "units":        s.units,
            "department":   s.department,
            "year_level":   s.year_level,
            "subject_type": s.subject_type,
        } for s in unique_subjects]), 200
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        return jsonify({"error": "Failed to fetch subjects"}), 500
    
    
@app.route('/api/admin/subjects/<int:subject_id>', methods=['DELETE'])
@admin_required
def admin_delete_subject(admin, subject_id):
    """
    Delete a subject.
    Cascades through junction tables before removing the subject row so
    that no FK constraint fires:
      1. TeacherAssignment rows that reference this subject
      2. block_subjects junction rows
      3. SubjectSection rows (and their IrregularEnrollment children)
      4. Problems that reference this subject (subject_id set to NULL)
    """
    subject = Subject.query.get_or_404(subject_id)
    subject_name = subject.name  # capture before deletion

    # 1. Remove teacher assignments for this subject
    TeacherAssignment.query.filter_by(subject_id=subject_id).delete()

    # 2. Remove block ↔ subject links
    db.session.query(block_subjects).filter(
        block_subjects.c.subject_id == subject_id
    ).delete(synchronize_session=False)

    # 3. Remove every SubjectSection that belongs to this subject,
    #    but first remove the IrregularEnrollment rows that point to them
    sections = SubjectSection.query.filter_by(subject_id=subject_id).all()
    for sec in sections:
        IrregularEnrollment.query.filter_by(section_id=sec.id).delete()
        db.session.delete(sec)

    # 4. Nullify subject_id on Problems (keeps the problems, just unlinks them)
    Problem.query.filter_by(subject_id=subject_id).update(
        {'subject_id': None}, synchronize_session=False
    )

    # 5. Also remove any Lesson rows linked to this subject
    Lesson.query.filter_by(subject_id=subject_id).delete()

    # 6. Finally delete the subject itself
    db.session.delete(subject)
    db.session.commit()

    log_admin_action(
        admin.id, "SUBJECT_DELETED",
        f"Deleted subject: {subject_name} (ID {subject_id}) — "
        f"cascade-removed teacher assignments, block links, and sections.",
        target_id=subject_id,       
    )

    return jsonify({"message": "Subject deleted successfully"}), 200

@app.route('/api/admin/subjects/<int:subject_id>', methods=['PUT'])
@admin_required
def admin_update_subject(admin, subject_id):
    """Update an existing subject"""
    subject = Subject.query.get_or_404(subject_id)
    data = request.get_json()
    changes = []

    # ── name ──────────────────────────────────────────────────────────
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({"error": "Subject name cannot be empty"}), 400
        if len(name) > 200:
            return jsonify({"error": "Subject name must be 200 characters or fewer"}), 400
        if name != subject.name:
            existing = Subject.query.filter(Subject.name == name, Subject.id != subject_id).first()
            if existing:
                return jsonify({"error": "A subject with this name already exists"}), 409
            changes.append(f"name: {subject.name} → {name}")
            subject.name = name

    # ── subject_code ──────────────────────────────────────────────────
    if 'subject_code' in data:
        code = data['subject_code'].strip().upper() if data['subject_code'] else None
        if code:
            if len(code) > 20:
                return jsonify({"error": "Subject code must be 20 characters or fewer"}), 400
            allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')
            if not all(ch in allowed_chars for ch in code):
                return jsonify({"error": "Subject code may only contain letters, digits, hyphens, and underscores"}), 400
            duplicate = Subject.query.filter(Subject.subject_code == code, Subject.id != subject_id).first()
            if duplicate:
                return jsonify({"error": f"Subject code '{code}' is already in use"}), 409
        changes.append(f"subject_code → {code}")
        subject.subject_code = code

    # ── internal_subject_no ───────────────────────────────────────────
    if 'internal_subject_no' in data:
        subject.internal_subject_no = data['internal_subject_no'].strip() or None
        changes.append("internal_subject_no updated")

    # ── description ───────────────────────────────────────────────────
    if 'description' in data:
        subject.description = data['description'].strip() or None
        changes.append("description updated")

    # ── units ─────────────────────────────────────────────────────────
    if 'units' in data:
        units = data['units']
        if units is not None:
            try:
                units = int(units)
                if units < 1 or units > 12:
                    return jsonify({"error": "Units must be between 1 and 12"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Units must be a valid integer"}), 400
        subject.units = units
        changes.append(f"units → {units}")

    # ── year_level ────────────────────────────────────────────────────
    if 'year_level' in data:
        year_level = data['year_level']
        if year_level is not None:
            try:
                year_level = int(year_level)
                if year_level < 1 or year_level > 6:
                    return jsonify({"error": "Year level must be between 1 and 6"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Year level must be a valid integer"}), 400
        subject.year_level = year_level
        changes.append(f"year_level → {year_level}")

    # ── subject_type ──────────────────────────────────────────────────
    if 'subject_type' in data:
        allowed_types = {'lab', 'lecture_lab', 'elective'}
        if data['subject_type'] not in allowed_types:
            return jsonify({"error": f"subject_type must be one of: {', '.join(sorted(allowed_types))}. Note: 'lecture' type is no longer accepted."}), 400
        subject.subject_type = data['subject_type']
        changes.append(f"subject_type → {data['subject_type']}")

    # ── department ────────────────────────────────────────────────────
    if 'department' in data:
        dept = data['department'].strip() or None
        if dept and len(dept) > 100:
            return jsonify({"error": "Department must be 100 characters or fewer"}), 400
        subject.department = dept
        changes.append(f"department → {dept}")

    db.session.commit()

    log_admin_action(
        admin.id,
        "SUBJECT_UPDATED",
        f"Updated subject: {subject.name} — {', '.join(changes) if changes else 'no changes'}",
        target_id=subject_id,
    )

    return jsonify({
        "message": "Subject updated successfully",
        "subject": {
            "id":                  subject.id,
            "name":                subject.name,
            "description":         subject.description,
            "subject_code":        subject.subject_code,
            "internal_subject_no": subject.internal_subject_no,
            "units":               subject.units,
            "department":          subject.department,
            "year_level":          subject.year_level,
            "subject_type":        subject.subject_type,
        }
    }), 200

# ===== ADMIN BLOCK ROUTES =====
@app.route('/api/admin/blocks', methods=['GET'])
@admin_required
def admin_get_blocks(admin):
    # Query the NEW Blocks table
    blocks = Block.query.all()
    result = []
    for block in blocks:
        # Count students in NEW student_blocks table
        student_count = db.session.query(student_blocks.c.student_id).filter_by(block_id=block.id).count()
        instructor = User.query.get(block.instructor_id)
        
        # Get subjects linked to this block
        # ✅ use distinct() to prevent duplicate subjects in display
        subject_rows = db.session.query(block_subjects.c.subject_id).filter_by(block_id=block.id).distinct().all()
        subject_ids = [r.subject_id for r in subject_rows]
        subjects_list = [Subject.query.get(sid).name for sid in subject_ids if Subject.query.get(sid)]
        
        result.append({
            "id": block.id, 
            "section_code": block.section_code, 
            "name": block.section_code, # Block name is the code
            "subjects": subjects_list,  # ✅ Show subjects grouped under block
            "semester": block.semester,
            "instructor": instructor.username if instructor else None, 
            "instructor_id": block.instructor_id,
            "student_count": student_count, 
            "instructor_count": 1 if instructor else 0,
            "created_at": block.created_at.isoformat()
        })
    return jsonify(result), 200

@app.route('/api/admin/blocks', methods=['POST'])
@admin_required
def admin_create_block(admin):
    data = request.get_json()
    # Expecting: { section_code: "101", semester: "1st", subjects: ["Intro", "Comp Prog"] }
    if not data.get('section_code'):
        return jsonify({"error": "Section Code required"}), 400
        
    # 1. Create or get the Block
    existing_block = Block.query.filter_by(section_code=data['section_code'], semester=data.get('semester')).first()
    if not existing_block:
        new_block = Block(
            section_code=data['section_code'], 
            semester=data.get('semester', ''),
            instructor_id=data.get('instructor_id')
        )
        db.session.add(new_block)
        db.session.flush() # Get ID immediately
        block_id = new_block.id
    else:
        block_id = existing_block.id

    # 2. Link Subjects
    subjects_to_link = data.get('subjects', []) # List of subject names
    for sub_name in subjects_to_link:
        # Find or Create Subject
        subject = Subject.query.filter_by(name=sub_name).first()
        if not subject:
            subject = Subject(name=sub_name)
            db.session.add(subject)
            db.session.flush()
            
        # Link Block to Subject
        existing_link = db.session.query(block_subjects).filter_by(
            block_id=block_id, 
            subject_id=subject.id
        ).first()
        
        if not existing_link:
            db.session.execute(block_subjects.insert().values(
                block_id=block_id, 
                subject_id=subject.id
            ))

    db.session.commit()
    log_admin_action(admin.id, "CREATE_BLOCK", f"Created/Updated block {data['section_code']} with {len(subjects_to_link)} subjects")
    return jsonify({"message": "Block updated", "block_id": block_id}), 201

@app.route('/api/admin/blocks/<int:block_id>', methods=['PUT'])
@admin_required
def admin_update_block(admin, block_id):
    block = Block.query.get_or_404(block_id)
    data = request.get_json()
    changes = []
    
    if 'section_code' in data:
        changes.append(f"Code: {block.section_code} → {data['section_code']}")
        block.section_code = data['section_code']
    
    if 'semester' in data:
        changes.append(f"Semester: {data['semester']}")
        block.semester = data['semester']
    
    if 'instructor_id' in data:
        changes.append(f"Instructor ID: {data['instructor_id']}")
        block.instructor_id = data['instructor_id']
    
    # ✅ Handle subject assignments
    if 'subject_ids' in data:
        subject_ids = data['subject_ids']
        
        # Remove all current subject assignments
        db.session.query(block_subjects).filter_by(block_id=block_id).delete()
        
        # Add new subject assignments
        if subject_ids:
            for subject_id in subject_ids:
                db.session.execute(block_subjects.insert().values(
                    block_id=block_id,
                    subject_id=subject_id
                ))
            changes.append(f"Assigned {len(subject_ids)} subjects")
        else:
            changes.append("Removed all subject assignments")
    
    db.session.commit()
    log_admin_action(admin.id, "UPDATE_BLOCK", f"Updated block {block.section_code}: {', '.join(changes)}", block_id)
    return jsonify({"message": "Block updated", "changes": changes}), 200

@app.route('/api/admin/blocks/<int:block_id>/students', methods=['GET'])
@jwt_required()
def get_block_students(block_id):
    token_user_id = int(get_jwt_identity())
    token_user = User.query.get(token_user_id)
    if not is_instructor_or_admin(token_user):
        return jsonify({"error": "Unauthorized"}), 403
    
    # ✅ use new student_blocks table
    student_rows = db.session.query(student_blocks.c.student_id)\
        .filter_by(block_id=block_id).all()
    student_ids = [s[0] for s in student_rows]
    
    students = User.query.filter(
        User.id.in_(student_ids),
        User.role == 'student'
    ).all() if student_ids else []
    
    return jsonify([{
        "id": s.id,
        "username": s.username,
        "full_name": s.full_name or s.username,
        "email": s.email,
        "xp": s.xp,
        "level": s.level,
        "is_active": s.is_active
    } for s in students]), 200

@app.route('/api/admin/blocks/<int:block_id>', methods=['DELETE'])
@admin_required
def admin_delete_block(admin, block_id):
    # ✅ Use the new Block model
    block = Block.query.get_or_404(block_id)
    section_code = block.section_code
    
    # ✅ Clean up related data in new tables
    db.session.query(block_subjects).filter_by(block_id=block_id).delete()
    db.session.query(student_blocks).filter_by(block_id=block_id).delete()
    db.session.query(block_problems).filter_by(block_id=block_id).delete()
    TeacherAssignment.query.filter_by(block_id=block_id).delete()
    
    # ✅ Delete the block itself
    db.session.delete(block)
    db.session.commit()
    
    log_admin_action(admin.id, "DELETE_BLOCK", f"Deleted block {section_code}", block_id)
    return jsonify({"message": "Block deleted"}), 200


@app.route('/api/admin/instructor-assignments', methods=['POST'])
@admin_required
def admin_create_instructor_assignment(admin):
    """Admin assigns an instructor to teach a subject in a block"""
    data = request.get_json()
    
    # Required fields
    required = ['instructor_id', 'subject_id', 'block_id']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields: instructor_id, subject_id, block_id"}), 400
    
    instructor_id = data['instructor_id']
    subject_id = data['subject_id']
    block_id = data['block_id']
    
    # Validate instructor exists and has instructor role
    instructor = User.query.get(instructor_id)
    if not instructor or instructor.role != 'instructor':
        return jsonify({"error": "Invalid instructor ID"}), 400
    
    # Validate subject exists
    subject = Subject.query.get(subject_id)
    if not subject:
        return jsonify({"error": "Invalid subject ID"}), 400
    
    # Validate block exists
    block = Block.query.get(block_id)
    if not block:
        return jsonify({"error": "Invalid block ID"}), 400
    
        # Check if assignment already exists
    existing = TeacherAssignment.query.filter_by(
        instructor_id=instructor_id,
        subject_id=subject_id,
        block_id=block_id
    ).first()

    if existing:
        return jsonify({"error": "Assignment already exists"}), 409
    
    # Create new assignment
    assignment = TeacherAssignment(
        instructor_id=instructor_id,
        subject_id=subject_id,
        block_id=block_id
    )
    db.session.add(assignment)
    db.session.commit()
    
    log_admin_action(admin.id, "INSTRUCTOR_ASSIGNED", 
                    f"Instructor {instructor.username} assigned to teach {subject.name} in Block {block.section_code}")
    
    return jsonify({
        "message": "Instructor assigned successfully",
        "assignment": {
            "id": assignment.id,
            "instructor": instructor.username,
            "subject": subject.name,
            "block": block.section_code
        }
    }), 201

@app.route('/api/admin/instructor-assignments/<int:assignment_id>', methods=['PUT'])
@admin_required
def admin_update_instructor_assignment(admin, assignment_id):
    """Update an instructor assignment"""
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['instructor_id', 'subject_id', 'block_id']):
        return jsonify({"error": "Missing required fields: instructor_id, subject_id, block_id"}), 400
    
    instructor_id = data['instructor_id']
    subject_id = data['subject_id']
    block_id = data['block_id']
    
    # Check for duplicate assignment (different assignment with same combo)
    duplicate = TeacherAssignment.query.filter(
        TeacherAssignment.instructor_id == instructor_id,
        TeacherAssignment.subject_id == subject_id,
        TeacherAssignment.block_id == block_id,
        TeacherAssignment.id != assignment_id
    ).first()
    
    if duplicate:
        return jsonify({"error": "This assignment already exists"}), 409
    
    # Validate entities exist
    instructor = User.query.get(instructor_id)
    if not instructor or instructor.role != 'instructor':
        return jsonify({"error": "Invalid instructor ID"}), 400
    
    subject = Subject.query.get(subject_id)
    if not subject:
        return jsonify({"error": "Invalid subject ID"}), 400
    
    block = Block.query.get(block_id)
    if not block:
        return jsonify({"error": "Invalid block ID"}), 400

    # Get old values for logging
    old_instructor = User.query.get(assignment.instructor_id)
    old_subject = Subject.query.get(assignment.subject_id)
    old_block = Block.query.get(assignment.block_id)
    
    # Update assignment
    assignment.instructor_id = instructor_id
    assignment.subject_id = subject_id
    assignment.block_id = block_id
    db.session.commit()
    
    log_admin_action(admin.id, "INSTRUCTOR_ASSIGNMENT_UPDATED", 
                    f"Updated: {old_instructor.username} teaching {old_subject.name} in {old_block.section_code} → {instructor.username} teaching {subject.name} in {block.section_code}")
    
    return jsonify({
        "message": "Assignment updated successfully",
        "assignment": {
            "id": assignment.id,
            "instructor": instructor.username,
            "subject": subject.name,
            "block": block.section_code
        }
    }), 200


@app.route('/api/admin/instructor-assignments', methods=['GET'])
@admin_required
def admin_get_instructor_assignments(admin):
    """Get all instructor assignments (with optional filters)"""
    instructor_id = request.args.get('instructor_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    block_id = request.args.get('block_id', type=int)
    
    query = TeacherAssignment.query
    
    if instructor_id:
        query = query.filter_by(instructor_id=instructor_id)
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    if block_id:
        query = query.filter_by(block_id=block_id)
    
    assignments = query.all()
    
    result = []
    for a in assignments:
        instructor = User.query.get(a.instructor_id)
        subject = Subject.query.get(a.subject_id)
        block = Block.query.get(a.block_id)
        
        result.append({
            "id": a.id,
            "instructor": {
                "id": instructor.id,
                "username": instructor.username
            } if instructor else None,
            "subject": {
                "id": subject.id,
                "name": subject.name
            } if subject else None,
            "block": {
                "id": block.id,
                "section_code": block.section_code
            } if block else None
        })
    
    return jsonify(result), 200

@app.route('/api/admin/instructor-assignments/<int:assignment_id>', methods=['DELETE'])
@admin_required
def admin_delete_instructor_assignment(admin, assignment_id):
    """Remove an instructor assignment"""
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    
    # Get details for logging
    instructor = User.query.get(assignment.instructor_id)
    subject = Subject.query.get(assignment.subject_id)
    block = Block.query.get(assignment.block_id)
    
    db.session.delete(assignment)
    db.session.commit()
    
    log_admin_action(admin.id, "INSTRUCTOR_UNASSIGNED", 
                    f"Removed assignment: {instructor.username} teaching {subject.name} in Block {block.section_code if block else 'Unknown'}")
    
    return jsonify({"message": "Assignment removed"}), 200
    
# ── Seed IT subjects (one-time, super_admin only) ──────────────────────
@app.route('/api/admin/seed-subjects', methods=['POST'])
@admin_required
def admin_seed_subjects(admin):
    result = seed_it_subjects()
    log_admin_action(
        admin.id, 'SUBJECTS_SEEDED',
        f"Seeded {result['seeded']} IT subjects, {result['skipped']} already existed."
    )
    return jsonify({
        "message": f"Seeded {result['seeded']} subjects. {result['skipped']} already existed.",
        "details": result
    }), 200

# ============================================================
# PASTE THIS BLOCK INTO app.py
#
# Add these imports at the top of app.py if not already present:
#   import unicodedata, re, base64, secrets, string, csv, io
#   (all are stdlib — no pip installs needed)
#
# Add these two SQLAlchemy models anywhere in the MODELS section:
#
#   class SubjectSection(db.Model):
#       __tablename__ = 'subject_sections'
#       id            = db.Column(db.Integer, primary_key=True)
#       section_no    = db.Column(db.String(20),  nullable=False)
#       subject_id    = db.Column(db.Integer,     db.ForeignKey('subjects.id'), nullable=False)
#       block_id      = db.Column(db.Integer,     db.ForeignKey('blocks.id'),   nullable=True)
#       schedule      = db.Column(db.String(100), nullable=True)
#       room          = db.Column(db.String(50),  nullable=True)
#       capacity      = db.Column(db.Integer,     nullable=False, default=40)
#       current_count = db.Column(db.Integer,     nullable=False, default=0)
#       semester      = db.Column(db.String(50),  nullable=True)
#       academic_year = db.Column(db.String(9),   nullable=True)
#       is_active     = db.Column(db.Boolean,     nullable=False, default=True)
#       created_at    = db.Column(db.DateTime,    default=datetime.utcnow)
#
#   class IrregularEnrollment(db.Model):
#       __tablename__ = 'irregular_enrollments'
#       id          = db.Column(db.Integer, primary_key=True)
#       student_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
#       section_id  = db.Column(db.Integer, db.ForeignKey('subject_sections.id'), nullable=False)
#       enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
#       __table_args__ = (
#           db.UniqueConstraint('student_id', 'section_id', name='unique_irregular_enrollment'),
#       )
#
# ============================================================


# ── Email-generation helpers ────────────────────────────────────────────

_SUFFIXES = frozenset({"jr", "sr", "i", "ii", "iii", "iv", "v"})


def _clean_name_part(token: str) -> str:
    """
    Normalise one name token for email use:
      - NFD decompose  →  strip combining accents  (ñ→n, é→e)
      - lowercase
      - remove every non-alpha character
        (hyphens, apostrophes, spaces already split out)
    """
    nfd = unicodedata.normalize("NFD", token)
    ascii_only = nfd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z]", "", ascii_only.lower())


def _build_email_local(firstname: str, middlename: str, lastname: str) -> str:
    """
    Build the local part of the Adamson email address.
    Rules (from spec):
      - Full first name (can be compound, e.g. "Paul Christian Caleb")
      - Full middle name (not just initial); skip if blank
      - Full last name; hyphens removed by _clean_name_part
      - Skip suffix tokens (Jr., I., etc.)
    Returns dot-joined parts, e.g. "paul.christian.caleb.rejano"
    """
    parts = []

    for token in firstname.strip().split():
        clean = token.rstrip(".")
        if clean.lower() not in _SUFFIXES:
            slug = _clean_name_part(token)
            if slug:
                parts.append(slug)

    if middlename and middlename.strip():
        for token in middlename.strip().split():
            clean = token.rstrip(".")
            if clean.lower() not in _SUFFIXES:
                slug = _clean_name_part(token)
                if slug:
                    parts.append(slug)

    for token in lastname.strip().split():
        clean = token.rstrip(".")
        if clean.lower() not in _SUFFIXES:
            slug = _clean_name_part(token)
            if slug:
                parts.append(slug)

    return ".".join(parts)


def _generate_enrollment_email(
    firstname: str,
    middlename: str,
    lastname: str,
    suffix: str,
    student_id_raw: str,
    existing_emails: set,
) -> str:
    """
    Return a unique @adamson.edu.ph email.
    Duplicate → append numeric part of student_id, e.g. paul.rejano.202400100
    """
    local = _build_email_local(firstname, middlename, lastname)
    email = f"{local}@adamson.edu.ph"

    if email not in existing_emails:
        return email

    # Collision — append digits from student_id
    id_digits = re.sub(r"[^0-9]", "", student_id_raw)
    email = f"{local}.{id_digits}@adamson.edu.ph"
    return email  # caller adds to set


def _generate_secure_password(length: int = 12) -> str:
    """
    Cryptographically secure 12-char password.
    Guarantees at least one uppercase, one digit, one symbol.
    """
    pool = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pwd = "".join(secrets.choice(pool) for _ in range(length))
        if (
            any(c.isupper() for c in pwd)
            and any(c.islower() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "!@#$%&*" for c in pwd)
        ):
            return pwd


# ── Route ───────────────────────────────────────────────────────────────

@app.route("/api/admin/enrollment/bulk-upload", methods=["POST"])
@admin_required
def admin_bulk_enrollment_upload(admin):
    """
    Master enrollment CSV upload — handles regular AND irregular students
    in a single file.

    CSV columns (header row required, order does NOT matter):
        student_id, firstname, middlename, lastname, suffix,
        year_level, student_type, block_code, section_no, subject_code

    Regular row example:
        2024-00001,Juan,Santos,Dela Cruz,,1,regular,IT101,,,

    Irregular row example (one row per section):
        2024-00100,Pedro,Jose,Reyes,,3,irregular,,29144,ITCED102L

    Returns JSON:
    {
        "summary":        { total_rows, created, enrolled, skipped, errors },
        "results":        [ { row, student_id, status, reason? } … ],
        "credential_csv": "<base64-encoded CSV>",
        "errors":         [ "human-readable error string" … ]
    }

    HTTP 200 on full success, 207 if any row had errors.
    """
    # ── 1. File validation ────────────────────────────────────────────────
    if "file" not in request.files:
        return jsonify({"error": "No file provided — send field name 'file'"}), 400

    f = request.files["file"]
    if not f.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only .csv files are accepted"}), 400

    raw = f.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds 5 MB limit"}), 413

    try:
        text   = raw.decode("utf-8-sig")          # handles Excel BOM
        reader = csv.DictReader(io.StringIO(text))
        rows   = list(reader)
    except Exception as exc:
        return jsonify({"error": f"CSV parse error: {exc}"}), 400

    if not rows:
        return jsonify({"error": "CSV file is empty"}), 400
    if len(rows) > 2000:
        return jsonify({"error": "Maximum 2000 rows per upload"}), 400

    # Normalise header names (strip whitespace, lowercase)
    rows = [{k.strip().lower(): (v or "").strip() for k, v in row.items() if k is not None} for row in rows]

    required_cols = {
        "student_id", "firstname", "middlename", "lastname", "suffix",
        "year_level", "student_type", "block_code", "section_no", "subject_code",
    }
    missing_cols = required_cols - set(rows[0].keys())
    if missing_cols:
        return jsonify({
            "error":   "Missing CSV columns",
            "missing": sorted(missing_cols),
        }), 400

    # ── 2. Pre-load lookup caches (avoids N+1 queries) ────────────────────
    # blocks:  section_code (upper) → Block object
    blocks_by_code: dict = {
        b.section_code.strip().upper(): b
        for b in Block.query.all()
    }

    # subject_sections: section_no (str) → SubjectSection object
    sections_by_no: dict = {
        str(s.section_no).strip(): s
        for s in SubjectSection.query.filter_by(is_active=True).all()
    }

    # existing emails in DB (for duplicate-email guard)
    existing_emails: set = {
        row[0] for row in db.session.query(User.email).all()
    }

    # existing usernames (username = student_id without hyphens, e.g. "2024-00001")
    existing_usernames: set = {
        row[0] for row in db.session.query(User.username).all()
    }

    # student_id string → User (already-created users, re-populated per flush)
    users_by_sid: dict = {
        u.username: u
        for u in User.query.filter_by(role="student").all()
    }

    # ── 3. Group rows by student_id for deduplication ─────────────────────
    # irregular students can have multiple rows (one per section)
    regular_rows:   list  = []
    irregular_dict: dict  = {}   # sid → [row, …]

    row_errors: list = []   # human-readable strings for the response

    for idx, row in enumerate(rows, start=2):   # start=2: row 1 is header
        stype = row["student_type"].strip().lower()
        sid   = row["student_id"].strip()

        if not sid:
            row_errors.append(f"Row {idx}: student_id is empty — skipped")
            continue
        if stype == "regular":
            regular_rows.append((idx, row))
        elif stype == "irregular":
            irregular_dict.setdefault(sid, []).append((idx, row))
        else:
            row_errors.append(
                f"Row {idx} (student_id={sid}): unknown student_type '{stype}' — skipped"
            )

    # ── 4. Processing helpers ─────────────────────────────────────────────

    results:         list = []
    credential_list: list = []   # dicts for the output CSV
    created_count   = 0
    enrolled_count  = 0
    skipped_count   = 0

    def _get_or_create_user(idx, row) -> "tuple[User|None, str|None, bool]":
        """
        Return (user, plain_password, is_new).
        plain_password is None when the user already existed.
        Flushes the new user to DB so its .id is available immediately.
        """
        nonlocal created_count, existing_emails, existing_usernames

        sid = row["student_id"].strip()

        # --- already in DB from a previous upload -----------------------
        if sid in users_by_sid:
            return users_by_sid[sid], None, False

        # --- basic field validation ------------------------------------
        fn = row.get("firstname",  "").strip()
        ln = row.get("lastname",   "").strip()
        mn = row.get("middlename", "").strip()
        sx = row.get("suffix",     "").strip()
        yl = row.get("year_level", "").strip()

        if not fn or not ln:
            row_errors.append(f"Row {idx} (student_id={sid}): firstname/lastname missing — skipped")
            return None, None, False

        year_level_int = None
        if yl.isdigit() and 1 <= int(yl) <= 6:
            year_level_int = int(yl)

        # --- username = student_id (matches existing CSV convention) ---
        if sid in existing_usernames:
            # user exists but wasn't in our cache — refresh & return
            user = User.query.filter_by(username=sid).first()
            if user:
                users_by_sid[sid] = user
                return user, None, False
            # shouldn't happen, but guard
            row_errors.append(f"Row {idx} (student_id={sid}): username conflict — skipped")
            return None, None, False

        # --- email generation ------------------------------------------
        email = _generate_enrollment_email(fn, mn, ln, sx, sid, existing_emails)
        if email in existing_emails:
            row_errors.append(
                f"Row {idx} (student_id={sid}): email '{email}' already taken — skipped"
            )
            return None, None, False

        # --- create user -----------------------------------------------
        plain_pwd = _generate_secure_password()

        full_name = " ".join(filter(None, [fn, mn, ln, sx]))

        new_user = User(
            username      = sid,
            email         = email,
            password_hash = generate_password_hash(plain_pwd),
            role          = "student",
            full_name     = full_name,
            is_active     = True,
            xp            = 0,
            level         = 1,
            created_at    = datetime.utcnow(),
        )
        db.session.add(new_user)
        db.session.flush()   # populates new_user.id without committing

        # Update in-memory caches so subsequent rows see this user
        existing_emails.add(email)
        existing_usernames.add(sid)
        users_by_sid[sid] = new_user

        created_count += 1
        credential_list.append({
            "student_id":       sid,
            "full_name":        full_name,
            "email":            email,
            "temp_password":    plain_pwd,
            "student_type":     row.get("student_type", "").strip().lower(),
            "block_or_section": "",   # filled in by caller
        })

        return new_user, plain_pwd, True

    # ── 5. Process REGULAR students ───────────────────────────────────────
    # Regular students are assigned to a BLOCK CODE (e.g., "IT101").
    # The block_code column in the CSV must match a Block.section_code in the DB.
    for idx, row in regular_rows:
        sid        = row["student_id"].strip()
        block_code = row["block_code"].strip().upper()  # e.g., "IT101"

        if not block_code:
            skipped_count += 1
            results.append({"row": idx, "student_id": sid, "status": "error",
                             "reason": "block_code (e.g., IT101) missing for regular student"})
            row_errors.append(
                f"Row {idx} (student_id={sid}): block_code (Block Code, e.g. IT101) is empty — skipped"
            )
            continue

        block = blocks_by_code.get(block_code)
        if not block:
            skipped_count += 1
            results.append({"row": idx, "student_id": sid, "status": "error",
                             "reason": f"block '{block_code}' not found"})
            row_errors.append(f"Row {idx} (student_id={sid}): block '{block_code}' not found — skipped")
            continue

        if not block.is_active:
            skipped_count += 1
            results.append({"row": idx, "student_id": sid, "status": "skipped",
                             "reason": f"block '{block_code}' is closed"})
            continue

        # Capacity check — count current enrollments in this block
        current_count = db.session.query(
            db.func.count(student_blocks.c.id)
        ).filter(student_blocks.c.block_id == block.id).scalar() or 0

        if current_count >= 40:
            block.is_active = False   # auto-close
            skipped_count  += 1
            results.append({"row": idx, "student_id": sid, "status": "skipped",
                             "reason": f"block '{block_code}' is full (40/40)"})
            row_errors.append(f"Row {idx} (student_id={sid}): block '{block_code}' is full — auto-closed")
            continue

        user, plain_pwd, is_new = _get_or_create_user(idx, row)
        if user is None:
            skipped_count += 1
            continue

        # Idempotency — skip if already enrolled in this block
        already = db.session.query(student_blocks.c.id).filter_by(
            student_id=user.id, block_id=block.id
        ).first()
        if already:
            skipped_count += 1
            results.append({"row": idx, "student_id": sid, "status": "skipped",
                             "reason": "already enrolled in this block"})
            continue

        db.session.execute(
            student_blocks.insert().values(
                student_id  = user.id,
                block_id    = block.id,
                enrolled_at = datetime.utcnow(),
            )
        )
        enrolled_count += 1

        # ✅ Auto-enroll into all sections belonging to this block
        block_sections = SubjectSection.query.filter_by(
            block_id=block.id, is_active=True
        ).all()
        for section in block_sections:
            already_in_section = IrregularEnrollment.query.filter_by(
                student_id=user.id,
                section_id=section.id
            ).first()
            if not already_in_section:
                db.session.add(IrregularEnrollment(
                    student_id  = user.id,
                    section_id  = section.id,
                    enrolled_at = datetime.utcnow(),
                ))
                section.current_count = (section.current_count or 0) + 1

        # Auto-close block when it reaches 40
        new_count = current_count + 1
        if new_count >= 40:
            block.is_active = False

        # Patch credential list entry with block info
        if is_new:
            credential_list[-1]["block_or_section"] = block_code

        results.append({
            "row":        idx,
            "student_id": sid,
            "status":     "created" if is_new else "enrolled",
            "block":      block_code,
        })

    # ── 6. Process IRREGULAR students ─────────────────────────────────────
    # Irregular students are assigned to specific CLASS CODES (section_no, e.g., "29144").
    # Each row for an irregular student maps to one SubjectSection.section_no in the DB.
    # A single irregular student can have multiple rows — one per class code they attend.
    for sid, sid_rows in irregular_dict.items():
        # Use the FIRST row to create / fetch the user
        first_idx, first_row = sid_rows[0]
        user, plain_pwd, is_new = _get_or_create_user(first_idx, first_row)

        if user is None:
            skipped_count += len(sid_rows)
            continue

        sections_enrolled = []

        for idx, row in sid_rows:
            section_no = row["section_no"].strip()

            section_no = row["section_no"].strip()

            if not section_no:
                skipped_count += 1
                results.append({"row": idx, "student_id": sid, "status": "error",
                                 "reason": "section_no (Class Code, e.g. 29144) missing for irregular student"})
                row_errors.append(
                    f"Row {idx} (student_id={sid}): section_no (Class Code, e.g. 29144) is empty — skipped"
                )
                continue

            section = sections_by_no.get(section_no)
            if not section:
                skipped_count += 1
                results.append({"row": idx, "student_id": sid, "status": "error",
                                 "reason": f"section '{section_no}' not found or inactive"})
                row_errors.append(
                    f"Row {idx} (student_id={sid}): section '{section_no}' not found — skipped"
                )
                continue

            # Idempotency — skip if already enrolled in this section
            already = IrregularEnrollment.query.filter_by(
                student_id = user.id,
                section_id = section.id,
            ).first()
            if already:
                skipped_count += 1
                results.append({"row": idx, "student_id": sid, "status": "skipped",
                                 "reason": f"already enrolled in section {section_no}"})
                continue

            enrollment = IrregularEnrollment(
                student_id  = user.id,
                section_id  = section.id,
                enrolled_at = datetime.utcnow(),
            )
            db.session.add(enrollment)

            # Bump section's current_count
            section.current_count = (section.current_count or 0) + 1

            enrolled_count    += 1
            sections_enrolled.append(section_no)

            results.append({
                "row":        idx,
                "student_id": sid,
                "status":     "created" if (is_new and idx == first_idx) else "enrolled",
                "section":    section_no,
            })

        # Patch credential list entry with section list
        if is_new and sections_enrolled:
            credential_list[-1]["block_or_section"] = ";".join(sections_enrolled)

    # ── 7. Commit everything ───────────────────────────────────────────────
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error":  "Database commit failed — all changes rolled back",
            "detail": str(exc),
        }), 500

    # ── 8. Build base64 credential CSV ────────────────────────────────────
    cred_buf = io.StringIO()
    cred_writer = csv.writer(cred_buf)
    cred_writer.writerow([
        "student_id", "full_name", "email",
        "temporary_password", "student_type",
        "block_or_sections", "must_change_password",
    ])
    for c in credential_list:
        cred_writer.writerow([
            c["student_id"],
            c["full_name"],
            c["email"],
            c["temp_password"],
            c["student_type"],
            c["block_or_section"],
            "YES",
        ])
    cred_b64 = base64.b64encode(
        cred_buf.getvalue().encode("utf-8")
    ).decode("utf-8")

    # ── 9. Audit log ──────────────────────────────────────────────────────
    log_admin_action(
        admin.id,
        "BULK_ENROLLMENT_UPLOAD",
        (
            f"Enrollment upload: {len(rows)} rows processed — "
            f"{created_count} accounts created, "
            f"{enrolled_count} enrollments added, "
            f"{skipped_count} skipped, "
            f"{len(row_errors)} errors."
        ),
    )

    # ── 10. Response ──────────────────────────────────────────────────────
    error_count = len(row_errors)
    return jsonify({
        "summary": {
            "total_rows": len(rows),
            "created":    created_count,
            "enrolled":   enrolled_count,
            "skipped":    skipped_count,
            "errors":     error_count,
        },
        "results":        results,
        "errors":         row_errors,
        "credential_csv": cred_b64,
    }), (207 if error_count else 200)


# ── Bulk CSV user upload ────────────────────────────────────────────────
@app.route('/api/admin/users/bulk-upload', methods=['POST'])
@admin_required
def admin_bulk_upload_users(admin):
    """
    Accepts a CSV file and bulk-creates student or instructor accounts.

    Form fields:
        role_type : 'student' or 'instructor'
        file      : the CSV file

    Student CSV columns  : student_id, firstname, lastname, year_level
    Instructor CSV columns: employee_id, firstname, lastname, department

    Returns a summary + base64-encoded credential CSV for download.
    """
    import secrets, string, base64

    role_type = request.form.get('role_type', 'student')
    if role_type not in ('student', 'instructor'):
        return jsonify({"error": "role_type must be 'student' or 'instructor'"}), 400

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "Only .csv files are accepted"}), 400

    raw = file.read(5 * 1024 * 1024)
    if len(raw) >= 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds 5 MB limit"}), 413

    # Parse CSV
    try:
        text   = raw.decode('utf-8-sig')   # handle Excel BOM
        reader = csv.DictReader(io.StringIO(text))
        rows   = list(reader)
    except Exception as e:
        return jsonify({"error": f"CSV parse error: {str(e)}"}), 400

    if not rows:
        return jsonify({"error": "CSV file is empty"}), 400
    if len(rows) > 1500:
        return jsonify({"error": "Maximum 1500 rows per upload"}), 400

    # Validate required columns
    headers = {k.strip().lower() for k in rows[0].keys()}
    required = (
        {'student_id', 'firstname', 'lastname', 'year_level'}
        if role_type == 'student'
        else {'employee_id', 'firstname', 'lastname', 'department'}
    )
    missing = required - headers
    if missing:
        return jsonify({"error": "Missing columns", "missing": sorted(missing)}), 400

    def _gen_password():
        chars = (
            secrets.choice(string.ascii_uppercase) +
            secrets.choice(string.ascii_uppercase) +
            secrets.choice(string.digits) +
            secrets.choice(string.digits) +
            secrets.choice('!@#$%') +
            ''.join(secrets.choice(string.ascii_lowercase) for _ in range(6))
        )
        lst = list(chars)
        secrets.SystemRandom().shuffle(lst)
        return ''.join(lst)

    results, created_users, errors = [], [], []

    try:
        for row_num, row in enumerate(rows, start=2):
            row = {k.strip().lower(): v.strip() for k, v in row.items()}

            row_errors = []
            fn = row.get('firstname', '')
            ln = row.get('lastname', '')
            if not fn or len(fn) > 50:
                row_errors.append('firstname missing or too long')
            if not ln or len(ln) > 50:
                row_errors.append('lastname missing or too long')

            if role_type == 'student':
                sid = row.get('student_id', '')
                if not sid or not sid.isdigit() or not (7 <= len(sid) <= 10):
                    row_errors.append('student_id must be 7–10 digits')
                yl = row.get('year_level', '')
                if not yl.isdigit() or int(yl) not in range(1, 7):
                    row_errors.append('year_level must be 1–6')
            else:
                eid = row.get('employee_id', '')
                if not eid or len(eid) > 20:
                    row_errors.append('employee_id missing or too long')

            if row_errors:
                errors.append({'row': row_num, 'errors': row_errors})
                results.append({'row': row_num, 'status': 'error', 'errors': row_errors})
                continue

            # Build email and username
            if role_type == 'student':
                email    = f"{row['student_id']}@adamson.edu.ph"
                username = row['student_id']
            else:
                fn_clean = ''.join(c for c in fn.lower() if c.isalpha())
                ln_clean = ''.join(c for c in ln.lower() if c.isalpha())
                email    = f"{ln_clean}.{fn_clean}@adamson.edu.ph"
                username = row.get('employee_id', email.split('@')[0])

            if User.query.filter_by(email=email).first():
                results.append({
                    'row': row_num, 'status': 'skipped',
                    'reason': 'email_exists', 'email': email
                })
                continue

            temp_pwd = _gen_password()
            new_user = User(
                username      = username,
                email         = email,
                password_hash = generate_password_hash(temp_pwd),
                role          = 'instructor' if role_type == 'instructor' else 'student',
                is_active     = True,
                xp            = 0,
                level         = 1
            )
            db.session.add(new_user)
            db.session.flush()

            created_users.append({
                'row':           row_num,
                'username':      username,
                'email':         email,
                'temp_password': temp_pwd,
                'status':        'created'
            })
            results.append({'row': row_num, 'status': 'created', 'email': email})

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error":   "Transaction rolled back",
            "detail":  str(e),
            "results": results
        }), 500

    # Build credential CSV for download (base64 encoded)
    cred_buf    = io.StringIO()
    cred_writer = csv.writer(cred_buf)
    id_col      = 'student_id' if role_type == 'student' else 'employee_id'
    cred_writer.writerow([id_col, 'email', 'temporary_password', 'must_change_password'])
    for u in created_users:
        cred_writer.writerow([u['username'], u['email'], u['temp_password'], 'YES'])
    cred_b64 = base64.b64encode(
        cred_buf.getvalue().encode('utf-8')
    ).decode('utf-8')

    log_admin_action(
        admin.id, 'BULK_USER_UPLOAD',
        f"Bulk upload ({role_type}): {len(created_users)} created, "
        f"{len(errors)} errors out of {len(rows)} rows."
    )

    status_code = 207 if errors else 200
    return jsonify({
        "summary": {
            "total_rows": len(rows),
            "created":    len(created_users),
            "skipped":    len(results) - len(created_users) - len(errors),
            "errors":     len(errors),
        },
        "results":        results,
        "credential_csv": cred_b64
    }), status_code


# ===== ADMIN SECTIONS ROUTES =====

@app.route('/api/admin/sections', methods=['GET'])
@admin_required
def admin_get_sections(admin):
    """Get all subject sections with enrollment counts and related info"""
    subject_id = request.args.get('subject_id', type=int)
    block_id = request.args.get('block_id', type=int)
    semester = request.args.get('semester', '')
    active_only = request.args.get('active_only', 'false').lower() == 'true'

    q = SubjectSection.query
    if subject_id:
        q = q.filter_by(subject_id=subject_id)
    if block_id:
        q = q.filter_by(block_id=block_id)
    if semester:
        q = q.filter_by(semester=semester)
    if active_only:
        q = q.filter_by(is_active=True)

    sections = q.order_by(SubjectSection.section_no).all()

    result = []
    for s in sections:
        subject = Subject.query.get(s.subject_id)
        block = Block.query.get(s.block_id) if s.block_id else None
        enrolled = IrregularEnrollment.query.filter_by(section_id=s.id).count()

        result.append({
            "id":            s.id,
            "section_no":    s.section_no,
            "subject_id":    s.subject_id,
            "subject_name":  subject.name if subject else None,
            "subject_code":  subject.subject_code if subject else None,
            "block_id":      s.block_id,
            "block_code":    block.section_code if block else None,
            "schedule":      s.schedule,
            "room":          s.room,
            "capacity":      s.capacity,
            "current_count": enrolled,
            "semester":      s.semester,
            "academic_year": s.academic_year,
            "is_active":     s.is_active,
            "created_at":    s.created_at.isoformat(),
        })

    return jsonify(result), 200


@app.route('/api/admin/sections', methods=['POST'])
@admin_required
def admin_create_section(admin):
    """Create a new subject section"""
    data = request.get_json()

    required = ['section_no', 'subject_id']
    if not all(k in data for k in required):
        return jsonify({"error": "section_no and subject_id are required"}), 400

    section_no = str(data['section_no']).strip()
    if not section_no:
        return jsonify({"error": "section_no cannot be empty"}), 400

    subject = Subject.query.get(data['subject_id'])
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    block_id = data.get('block_id')
    if block_id:
        block = Block.query.get(block_id)
        if not block:
            return jsonify({"error": "Block not found"}), 404

    # ✅ Check global uniqueness (matches DB constraint)
    existing = SubjectSection.query.filter_by(section_no=section_no).first()
    if existing:
        return jsonify({"error": f"Section number '{section_no}' is already in use university-wide"}), 409

    capacity = data.get('capacity', 40)
    try:
        capacity = int(capacity)
        if capacity < 1 or capacity > 200:
            return jsonify({"error": "Capacity must be between 1 and 200"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Capacity must be an integer"}), 400

    section = SubjectSection(
        section_no    = section_no,
        subject_id    = data['subject_id'],
        block_id      = block_id,
        schedule      = data.get('schedule', '').strip() or None,
        room          = data.get('room', '').strip() or None,
        capacity      = capacity,
        current_count = 0,
        semester      = data.get('semester', '').strip() or None,
        academic_year = data.get('academic_year', '').strip() or None,
        is_active     = data.get('is_active', True),
    )
    db.session.add(section)
    db.session.commit()

    log_admin_action(admin.id, "SECTION_CREATED",
        f"Created section {section_no} for {subject.name}", target_id=section.id)

    return jsonify({
        "message":    "Section created successfully",
        "section_id": section.id,
        "section_no": section.section_no,
    }), 201


@app.route('/api/admin/sections/<int:section_id>', methods=['PUT'])
@admin_required
def admin_update_section(admin, section_id):
    """Update a subject section"""
    section = SubjectSection.query.get_or_404(section_id)
    data = request.get_json()
    changes = []

    if 'section_no' in data:
        new_no = str(data['section_no']).strip()
        if new_no != section.section_no:
            changes.append(f"section_no: {section.section_no} → {new_no}")
            section.section_no = new_no

    if 'subject_id' in data:
        subject = Subject.query.get(data['subject_id'])
        if not subject:
            return jsonify({"error": "Subject not found"}), 404
        if data['subject_id'] != section.subject_id:
            changes.append(f"subject_id: {section.subject_id} → {data['subject_id']}")
            section.subject_id = data['subject_id']

    if 'block_id' in data:
        block_id = data['block_id']
        if block_id is not None:
            block = Block.query.get(block_id)
            if not block:
                return jsonify({"error": "Block not found"}), 404
        changes.append(f"block_id: {section.block_id} → {block_id}")
        section.block_id = block_id

    if 'schedule' in data:
        section.schedule = data['schedule'].strip() or None
        changes.append("schedule updated")

    if 'room' in data:
        section.room = data['room'].strip() or None
        changes.append("room updated")

    if 'capacity' in data:
        try:
            cap = int(data['capacity'])
            if cap < 1 or cap > 200:
                return jsonify({"error": "Capacity must be between 1 and 200"}), 400
            section.capacity = cap
            changes.append(f"capacity → {cap}")
        except (ValueError, TypeError):
            return jsonify({"error": "Capacity must be an integer"}), 400

    if 'semester' in data:
        section.semester = data['semester']
    if 'academic_year' in data:
        section.academic_year = data['academic_year']
    if 'is_active' in data:
        section.is_active = bool(data['is_active'])
        changes.append(f"is_active → {section.is_active}")

    db.session.commit()
    log_admin_action(admin.id, "SECTION_UPDATED",
        f"Updated section {section.section_no}: {', '.join(changes) or 'no changes'}",
        target_id=section_id)

    return jsonify({"message": "Section updated", "changes": changes}), 200


@app.route('/api/admin/sections/<int:section_id>', methods=['DELETE'])
@admin_required
def admin_delete_section(admin, section_id):
    """Delete a section (only if no irregular enrollments exist)"""
    section = SubjectSection.query.get_or_404(section_id)

    enrolled = IrregularEnrollment.query.filter_by(section_id=section_id).count()
    if enrolled > 0:
        return jsonify({
            "error": f"Cannot delete — {enrolled} student(s) are enrolled in this section. Unenroll them first."
        }), 400

    section_no = section.section_no
    db.session.delete(section)
    db.session.commit()

    log_admin_action(admin.id, "SECTION_DELETED", f"Deleted section {section_no}", target_id=section_id)
    return jsonify({"message": "Section deleted"}), 200


@app.route('/api/admin/sections/<int:section_id>/enrollments', methods=['GET'])
@admin_required
def admin_get_section_enrollments(admin, section_id):
    """Get all students enrolled in a specific section"""
    section = SubjectSection.query.get_or_404(section_id)

    enrollments = IrregularEnrollment.query.filter_by(section_id=section_id).all()
    students = []
    for e in enrollments:
        student = User.query.get(e.student_id)
        if student:
            students.append({
                "enrollment_id": e.id,
                "student_id":    student.id,
                "username":      student.username,
                "full_name":     student.full_name or student.username,
                "email":         student.email,
                "enrolled_at":   e.enrolled_at.isoformat(),
            })

    subject = Subject.query.get(section.subject_id)
    return jsonify({
        "section": {
            "id":         section.id,
            "section_no": section.section_no,
            "subject":    subject.name if subject else None,
            "schedule":   section.schedule,
            "room":       section.room,
            "capacity":   section.capacity,
        },
        "enrolled_count": len(students),
        "students":       students,
    }), 200


@app.route('/api/admin/sections/bulk-upload', methods=['POST'])
@admin_required
def admin_bulk_upload_sections(admin):
    """
    Bulk create sections from CSV.

    CSV columns:
        section_no, subject_code, block_code, schedule, room,
        capacity, semester, academic_year
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files['file']
    if not f.filename.lower().endswith('.csv'):
        return jsonify({"error": "Only .csv files accepted"}), 400

    raw = f.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds 5 MB"}), 413

    try:
        text   = raw.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(text))
        rows   = list(reader)
    except Exception as e:
        return jsonify({"error": f"CSV parse error: {e}"}), 400

    if not rows:
        return jsonify({"error": "CSV is empty"}), 400

    rows = [{k.strip().lower(): (v or '').strip() for k, v in row.items()} for row in rows]

    required_cols = {'section_no', 'subject_code'}
    missing = required_cols - set(rows[0].keys())
    if missing:
        return jsonify({"error": "Missing columns", "missing": sorted(missing)}), 400

    subjects_by_code = {s.subject_code.upper(): s for s in Subject.query.filter(Subject.subject_code != None).all()}
    blocks_by_code   = {b.section_code.upper(): b for b in Block.query.all()}

    results = []
    created = 0
    skipped = 0
    errors  = 0

    for idx, row in enumerate(rows, start=2):
        section_no   = row.get('section_no', '').strip()
        subject_code = row.get('subject_code', '').strip().upper()

        if not section_no or not subject_code:
            errors += 1
            results.append({"row": idx, "status": "error", "reason": "section_no and subject_code required"})
            continue

        subject = subjects_by_code.get(subject_code)
        if not subject:
            errors += 1
            results.append({"row": idx, "status": "error", "reason": f"subject_code '{subject_code}' not found"})
            continue

        block_code = row.get('block_code', '').strip().upper()
        block = blocks_by_code.get(block_code) if block_code else None

        semester      = row.get('semester', '').strip() or None
        academic_year = row.get('academic_year', '').strip() or None

        # ✅ Check global uniqueness (matches DB constraint)
        existing = SubjectSection.query.filter_by(section_no=section_no).first()
        if existing:
            existing_subject = Subject.query.get(existing.subject_id)
            subject_label = existing_subject.subject_code if existing_subject else f"subject_id={existing.subject_id}"
            skipped += 1
            results.append({
                "row": idx,
                "status": "skipped",
                "reason": f"section_no '{section_no}' already assigned to {subject_label}"
            })
            continue

        try:
            capacity = int(row.get('capacity', 40))
        except ValueError:
            capacity = 40

        section = SubjectSection(
            section_no    = section_no,
            subject_id    = subject.id,
            block_id      = block.id if block else None,
            schedule      = row.get('schedule', '').strip() or None,
            room          = row.get('room', '').strip() or None,
            capacity      = max(1, min(200, capacity)),
            current_count = 0,
            semester      = semester,
            academic_year = academic_year,
            is_active     = True,
        )
        db.session.add(section)
        created += 1
        results.append({"row": idx, "status": "created", "section_no": section_no, "subject": subject.name})

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Commit failed", "detail": str(e)}), 500

    log_admin_action(admin.id, "SECTIONS_BULK_UPLOAD",
        f"Sections CSV: {created} created, {skipped} skipped, {errors} errors from {len(rows)} rows.")

    return jsonify({
        "summary": {"total_rows": len(rows), "created": created, "skipped": skipped, "errors": errors},
        "results": results,
    }), (207 if errors else 200)


# ===== UTILITY & INIT =====
@app.route('/api/health')
def health(): 
    return jsonify({"status": "running", "version": "1.0"}), 200

with app.app_context():
        # ===== SEED ACHIEVEMENTS =====
    if not Achievement.query.first():
        achievements_data = [
            # --- STUDENT BADGES (12) ---
            {"name": "First Steps", "desc": "Complete your first quest", "icon": "🎯", "xp": 10, "type": "quest_count", "val": 1, "cat": "student"},
            {"name": "Quest Master", "desc": "Complete 10 quests", "icon": "⚔️", "xp": 50, "type": "quest_count", "val": 10, "cat": "student"},
            {"name": "Week Warrior", "desc": "Maintain a 7-day streak", "icon": "🔥", "xp": 20, "type": "streak", "val": 7, "cat": "student"},
            {"name": "Python Novice", "desc": "Solve 5 Python quests", "icon": "🐍", "xp": 15, "type": "python_count", "val": 5, "cat": "student"},
            {"name": "Java Apprentice", "desc": "Solve 5 Java quests", "icon": "☕", "xp": 15, "type": "java_count", "val": 5, "cat": "student"},
            {"name": "C# Wizard", "desc": "Solve 5 C# quests", "icon": "🔷", "xp": 15, "type": "csharp_count", "val": 5, "cat": "student"},
            {"name": "Hard Coder", "desc": "Complete 5 Hard quests", "icon": "💀", "xp": 40, "type": "hard_count", "val": 5, "cat": "student"},
            {"name": "Debug Master", "desc": "Complete 5 Debugging quests", "icon": "🐛", "xp": 30, "type": "debug_count", "val": 5, "cat": "student"},
            {"name": "Marathon Coder", "desc": "Maintain a 30-day streak", "icon": "🏃", "xp": 100, "type": "streak", "val": 30, "cat": "student"},
            {"name": "Perfect Score", "desc": "Get 100% on a Hard quest", "icon": "💯", "xp": 25, "type": "perfect_hard", "val": 1, "cat": "student"},
            {"name": "Sandbox Wizard", "desc": "Run code in Sandbox 10 times", "icon": "🧪", "xp": 20, "type": "sandbox_runs", "val": 10, "cat": "student"},
            {"name": "Leaderboard Champ", "desc": "Reach Top 10 on Leaderboard", "icon": "", "xp": 50, "type": "leaderboard", "val": 10, "cat": "student"},

            # --- INSTRUCTOR BADGES (15) ---
            {"name": "First Module", "desc": "Create your first module", "icon": "📖", "xp": 25, "type": "lesson_count", "val": 1, "cat": "instructor"},
            {"name": "Activity Architect", "desc": "Create 10 activities", "icon": "🧩", "xp": 60, "type": "problem_count", "val": 10, "cat": "instructor"},
            {"name": "Class Starter", "desc": "Have a student complete a quest", "icon": "🚀", "xp": 20, "type": "student_quest", "val": 1, "cat": "instructor"},
            {"name": "Engagement Booster", "desc": "80%+ students attempt a quest", "icon": "📈", "xp": 40, "type": "engagement", "val": 80, "cat": "instructor"},
            {"name": "Curriculum Builder", "desc": "Create lessons for 3 weeks", "icon": "🗂️", "xp": 50, "type": "lesson_weeks", "val": 3, "cat": "instructor"},
            {"name": "Resource Curator", "desc": "Attach files to 10 lessons", "icon": "📎", "xp": 30, "type": "file_count", "val": 10, "cat": "instructor"},
            {"name": "Multimedia Master", "desc": "Add videos to 5 lessons", "icon": "🎬", "xp": 25, "type": "video_count", "val": 5, "cat": "instructor"},
            {"name": "Clear Explainer", "desc": "Lesson with 95% completion", "icon": "🗣️", "xp": 45, "type": "lesson_completion", "val": 95, "cat": "instructor"},
            {"name": "Activity Solver", "desc": "Activity with <10% error rate", "icon": "🔍", "xp": 40, "type": "problem_quality", "val": 10, "cat": "instructor"},
            {"name": "Innovation Award", "desc": "Create a quest with hints", "icon": "💡", "xp": 50, "type": "hints_used", "val": 1, "cat": "instructor"},
            {"name": "Student Success", "desc": "70%+ students pass all quests", "icon": "🎓", "xp": 75, "type": "class_pass_rate", "val": 70, "cat": "instructor"},
            {"name": "Daily Educator", "desc": "Login and act for 14 days", "icon": "📅", "xp": 30, "type": "instructor_streak", "val": 14, "cat": "instructor"},
            {"name": "Semester Veteran", "desc": "Teach for 16 weeks", "icon": "🎓", "xp": 100, "type": "weeks_taught", "val": 16, "cat": "instructor"},
            {"name": "Multi-Class Maestro", "desc": "Teach 3 different subjects", "icon": "🎭", "xp": 60, "type": "subjects_taught", "val": 3, "cat": "instructor"},
            {"name": "Platform Pioneer", "desc": "Use new features within 1 week", "icon": "🚀", "xp": 20, "type": "early_adopter", "val": 1, "cat": "instructor"}
        ]

        for data in achievements_data:
            db.session.add(Achievement(
                name=data["name"],
                description=data["desc"],
                icon=data["icon"],
                xp_reward=data["xp"],
                requirement_type=data["type"],
                requirement_value=data["val"],
                category=data["cat"]
            ))
        db.session.commit()
        print("✅ Seeded 27 Achievements")
    db.create_all()
    
    # Auto-migration for users table
    try:
        inspector = inspect(db.engine)
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        if 'full_name' not in user_columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(200) DEFAULT NULL"))
                conn.commit()
                print("✅ Added column 'full_name' to users table")
    except Exception as e:
        print(f"⚠️ Users migration check skipped: {e}")

    # Auto-migration for Problem table
    try:
        inspector = inspect(db.engine)
        problem_columns = [col['name'] for col in inspector.get_columns('problems')]
        
        def add_col_if_missing(col_name, col_def):
            if col_name not in problem_columns:
                with db.engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE problems ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                    print(f"✅ Added column '{col_name}' to problems table")

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
        add_col_if_missing('due_date', "DATETIME DEFAULT NULL") 
        add_col_if_missing('login_attempts', "INT DEFAULT 0")
        add_col_if_missing('locked_until', "DATETIME DEFAULT NULL")
    except Exception as e:
        print(f"⚠️ Migration check skipped: {e}")
    
    # Seed default config
    if not SystemConfig.query.first():
        for k,v in {'execution_timeout':'5','enabled_languages':'python,java,csharp','xp_multiplier':'1.0','plagiarism_threshold':'0.85','maintenance_mode':'false'}.items():
            db.session.add(SystemConfig(key=k, value=v))
        db.session.commit()
    
    print("✅ DB Initialized | 🔐 JWT | 🎮 Gamification | 📚 Sections | 🛡️ Admin System")

if __name__ == '__main__':
    print("🚀 Forge.dev Backend | 📊 System-Ready | 🧪 Sandbox Active")
    app.run(debug=True, host='0.0.0.0', port=5000)  