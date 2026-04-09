export const SUBJECTS = [
  'Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics',
  'Geography', 'History', 'Civic Education', 'Computer Studies',
  'Additional Mathematics', 'Commerce', 'Principles of Accounts',
  'French', 'Further Mathematics', 'Economics', 'Literature in English',
  'Business Studies', 'Computer Science', 'Accounting',
]

export const FORM_LEVELS = [
  'Form 1', 'Form 2', 'Form 3', 'Form 4 (O-Level)',
  'Form 5', 'Form 6 (A-Level)',
]

export const FORM_LEVELS_WITH_UNSURE = [
  ...FORM_LEVELS, 'Not sure',
]

export const LESSON_STATUS = {
  ACTIVE: 'active',
  DRAFT:  'draft',
}

export const BOOKING_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const PAYOUT_STATUS = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  COMPLETED:  'completed',
  FAILED:     'failed',
}

export const TOPIC_REQUEST_STATUS = {
  OPEN:        'open',
  IN_PROGRESS: 'in_progress',
  CLOSED:      'closed',
}

// Shared badge style maps used across admin pages
export const PAYOUT_STATUS_STYLES = {
  pending:    { bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  processing: { bg: 'var(--blue-bg)',   color: 'var(--blue-text)'  },
  completed:  { bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  failed:     { bg: 'var(--red-bg)',    color: 'var(--red-text)'   },
}

export const REPORT_STATUS_STYLES = {
  pending:      { label: 'Pending',       bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  under_review: { label: 'Under review',  bg: 'var(--blue-bg)',   color: 'var(--blue-text)'  },
  resolved:     { label: 'Resolved',      bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  dismissed:    { label: 'Dismissed',     bg: 'var(--border-light)', color: 'var(--text-faint)'            },
}

export const URGENCY_STYLES = {
  normal:    { label: 'Normal',    bg: '#f3f4f6',               color: '#6b7280'           },
  urgent:    { label: 'Urgent',    bg: 'var(--amber-bg)',        color: 'var(--amber-text)' },
  exam_prep: { label: 'Exam prep', bg: 'var(--red-bg)',          color: 'var(--red-text)'   },
}

export const TOPIC_STATUS_STYLES = {
  open:        { label: 'Open',        bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  in_progress: { label: 'Responding',  bg: 'var(--blue-bg)',   color: 'var(--blue-text)'  },
  covered:     { label: 'Covered',     bg: 'var(--border-light)', color: 'var(--text-muted)'            },
  closed:      { label: 'Closed',      bg: 'var(--border-light)', color: 'var(--text-faint)'            },
}
