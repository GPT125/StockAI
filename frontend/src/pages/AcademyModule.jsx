import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Play, FileText, ClipboardList, Target, Gamepad2, Clock, BarChart3 } from 'lucide-react';
import { COURSES, findCourse } from '../data/academyCourses';
import { useAuth } from '../context/AuthContext';

function loadCompleted(userId) {
  try {
    const raw = localStorage.getItem(`investai-academy-${userId || 'guest'}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

const KIND_ICON = {
  video: Play,
  text: FileText,
  quiz: ClipboardList,
  activity: Target,
  game: Gamepad2,
};

const KIND_LABEL = {
  video: 'Video + Notes',
  text: 'Reading',
  quiz: 'Quiz',
  activity: 'Hands-on Activity',
  game: 'Interactive Game',
};

export default function AcademyModule() {
  const { moduleId } = useParams(); // moduleId is actually courseId in our new system
  const { user } = useAuth();
  const course = findCourse(moduleId);

  if (!course) return <Navigate to="/academy" replace />;

  const completed = loadCompleted(user?.id);
  const done = course.lessons.filter(l => completed.has(l.id)).length;
  const pct = Math.round((done / course.lessons.length) * 100);

  const courseIdx = COURSES.findIndex(c => c.id === moduleId);
  const prevCourse = courseIdx > 0 ? COURSES[courseIdx - 1] : null;
  const nextCourse = courseIdx < COURSES.length - 1 ? COURSES[courseIdx + 1] : null;

  // Find next unfinished lesson in this course
  const nextLesson = course.lessons.find(l => !completed.has(l.id));

  return (
    <div className="dashboard">
      <Link to="/academy" className="academy-back-link"><ArrowLeft size={16} /> Back to Academy</Link>

      <div className="dashboard-header" style={{ marginTop: 8 }}>
        <div>
          <div className="academy-module-eyebrow">
            <span style={{ color: course.color }}>{course.icon}</span> Course {courseIdx + 1} of {COURSES.length} · {course.level}
          </div>
          <h1>{course.title}</h1>
          <span className="dashboard-date">{course.summary}</span>
        </div>
        {nextLesson && (
          <Link to={`/academy/${course.id}/${nextLesson.id}`} className="analyze-btn" style={{ textDecoration: 'none' }}>
            <Play size={16} /> {done === 0 ? 'Start Course' : 'Continue'}
          </Link>
        )}
      </div>

      {/* Course progress */}
      <div className="academy-progress-card">
        <div className="academy-progress-header">
          <div>
            <div className="academy-progress-label">Course progress</div>
            <div className="academy-progress-count">{done} / {course.lessons.length} lessons completed</div>
          </div>
          <div className="academy-progress-pct">{pct}%</div>
        </div>
        <div className="academy-progress-bar">
          <div className="academy-progress-fill" style={{ width: `${pct}%`, background: course.color }} />
        </div>
      </div>

      {/* Course info badges */}
      <div className="academy-course-badges">
        <span className="academy-badge"><Clock size={14} /> {course.duration}</span>
        <span className="academy-badge"><BarChart3 size={14} /> {course.level}</span>
        <span className="academy-badge"><FileText size={14} /> {course.lessons.filter(l => l.kind === 'text').length} articles</span>
        <span className="academy-badge"><Play size={14} /> {course.lessons.filter(l => l.kind === 'video').length} videos</span>
        <span className="academy-badge"><ClipboardList size={14} /> {course.lessons.filter(l => l.kind === 'quiz').length} quizzes</span>
        {course.lessons.some(l => l.kind === 'game') && (
          <span className="academy-badge"><Gamepad2 size={14} /> {course.lessons.filter(l => l.kind === 'game').length} games</span>
        )}
      </div>

      {/* Lesson list */}
      <div className="academy-lesson-list">
        {course.lessons.map((l, i) => {
          const Icon = KIND_ICON[l.kind] || FileText;
          const isDone = completed.has(l.id);
          return (
            <Link to={`/academy/${course.id}/${l.id}`} key={l.id} className={`academy-lesson-row ${isDone ? 'done' : ''}`}>
              <div className="academy-lesson-num">{i + 1}</div>
              <div className="academy-lesson-icon"><Icon size={18} /></div>
              <div className="academy-lesson-info">
                <div className="academy-lesson-title">{l.title}</div>
                <div className="academy-lesson-kind">{KIND_LABEL[l.kind] || l.kind}</div>
              </div>
              {isDone && <CheckCircle2 size={18} className="academy-lesson-check" />}
            </Link>
          );
        })}
      </div>

      {/* Prev / next course */}
      <div className="academy-module-nav">
        {prevCourse ? (
          <Link to={`/academy/${prevCourse.id}`} className="academy-nav-btn">
            <ArrowLeft size={14} /> {prevCourse.title.length > 35 ? prevCourse.title.slice(0, 35) + '…' : prevCourse.title}
          </Link>
        ) : <span />}
        {nextCourse ? (
          <Link to={`/academy/${nextCourse.id}`} className="academy-nav-btn">
            {nextCourse.title.length > 35 ? nextCourse.title.slice(0, 35) + '…' : nextCourse.title} →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
