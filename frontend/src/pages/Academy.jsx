import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, PlayCircle, Clock, Award, BarChart3 } from 'lucide-react';
import { COURSES, TOTAL_LESSONS } from '../data/academyCourses';
import { useAuth } from '../context/AuthContext';

/** Read per-user completed-lesson set from localStorage. */
function loadCompleted(userId) {
  try {
    const raw = localStorage.getItem(`investai-academy-${userId || 'guest'}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

const LEVEL_COLORS = {
  Beginner: '#22c55e',
  'Beginner → Intermediate': '#3b82f6',
  Intermediate: '#f59e0b',
  Advanced: '#ef4444',
  'All levels': '#8b5cf6',
};

export default function Academy() {
  const { user } = useAuth();
  const completed = loadCompleted(user?.id);

  const totalDone = completed.size;
  const pct = Math.min(100, Math.round((totalDone / TOTAL_LESSONS) * 100));

  // Find the next unfinished lesson across all courses
  let nextLesson = null;
  for (const course of COURSES) {
    for (const l of course.lessons) {
      if (!completed.has(l.id)) {
        nextLesson = { course, lesson: l };
        break;
      }
    }
    if (nextLesson) break;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1><BookOpen size={26} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Investing Academy</h1>
          <span className="dashboard-date">Go from beginner to pro at your own pace · {TOTAL_LESSONS} lessons across {COURSES.length} courses</span>
        </div>
        {nextLesson && (
          <Link to={`/academy/${nextLesson.course.id}/${nextLesson.lesson.id}`} className="analyze-btn" style={{ textDecoration: 'none' }}>
            <PlayCircle size={16} /> {totalDone === 0 ? 'Start Learning' : 'Continue Learning'}
          </Link>
        )}
      </div>

      {/* Overall progress */}
      <div className="academy-progress-card">
        <div className="academy-progress-header">
          <div>
            <div className="academy-progress-label">Your overall progress</div>
            <div className="academy-progress-count">{totalDone} / {TOTAL_LESSONS} lessons completed</div>
          </div>
          <div className="academy-progress-pct">{pct}%</div>
        </div>
        <div className="academy-progress-bar">
          <div className="academy-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Course grid */}
      <div className="academy-courses-grid">
        {COURSES.map((course) => {
          const done = course.lessons.filter(l => completed.has(l.id)).length;
          const coursePct = Math.round((done / course.lessons.length) * 100);
          const isComplete = done === course.lessons.length;
          return (
            <Link to={`/academy/${course.id}`} key={course.id} className="academy-course-card">
              <div className="academy-course-header">
                <span className="academy-course-icon" style={{ background: course.color + '22', color: course.color }}>
                  {course.icon}
                </span>
                <span className="academy-course-level" style={{ color: LEVEL_COLORS[course.level] || '#94a3b8' }}>
                  <BarChart3 size={11} /> {course.level}
                </span>
              </div>
              <h3 className="academy-course-title">
                {course.title}
                {isComplete && <CheckCircle2 size={16} style={{ marginLeft: 6, color: '#22c55e' }} />}
              </h3>
              <p className="academy-course-tagline">{course.tagline}</p>
              <div className="academy-course-meta">
                <span><Clock size={12} /> {course.duration}</span>
                <span>{course.lessons.length} lessons</span>
                <span>{done} / {course.lessons.length} done</span>
              </div>
              <div className="academy-mini-bar">
                <div className="academy-mini-fill" style={{ width: `${coursePct}%`, background: course.color }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
