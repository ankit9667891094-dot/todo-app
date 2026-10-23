import { useEffect, useMemo, useState } from 'react';
import './App.css';

const PRIORITIES = ['High', 'Medium', 'Low'];
const CATEGORIES = ['Study', 'Personal', 'Work', 'Health', 'Other'];

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

const EMPTY_FORM = {
  text: '',
  date: '',
  hour: '09',
  minute: '00',
  period: 'AM',
  priority: 'Medium',
  category: 'Study'
};

// Convert AM/PM to 24-hour time
function to24h(hour, minute, period) {
  let h = Number(hour) % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

// Format date
function formatDate(value) {
  if (!value) return 'No date';

  return new Date(`${value}T12:00:00`).toLocaleDateString(
    'en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

// Check overdue tasks
function isOverdue(item) {
  if (item.completed || !item.date) return false;

  const due = new Date(
    `${item.date}T${to24h(item.hour, item.minute, item.period)}:00`
  );

  return due < new Date();
}

function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');

  // Load saved tasks
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tasks') || '[]');
    } catch {
      return [];
    }
  });

  // Load saved theme
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  // Save tasks and theme
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Update form fields
  function updateField(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
    setError('');
  }

  // Reset form
  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  }

  // Add or edit task
  function handleSubmit(event) {
    event.preventDefault();

    if (!form.text.trim()) {
      setError('Task name is required.');
      return;
    }

    if (!form.date) {
      setError('Please select a date.');
      return;
    }

    const taskData = {
      ...form,
      text: form.text.trim()
    };

    if (editingId !== null) {
      setTasks((old) =>
        old.map((item) =>
          item.id === editingId
            ? { ...item, ...taskData }
            : item
        )
      );
    } else {
      setTasks((old) => [
        ...old,
        {
          id: Date.now(),
          ...taskData,
          completed: false
        }
      ]);
    }

    resetForm();
  }

  // Load task for editing
  function handleEditTask(item) {
    setForm({
      text: item.text,
      date: item.date || '',
      hour: item.hour || '09',
      minute: item.minute || '00',
      period: item.period || 'AM',
      priority: item.priority || 'Medium',
      category: item.category || 'Other'
    });

    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Delete task
  function handleDeleteTask(id) {
    if (!window.confirm('Delete this task?')) return;

    setTasks((old) => old.filter((item) => item.id !== id));

    if (editingId === id) resetForm();
  }

  // Complete or undo task
  function handleCompleteTask(id) {
    setTasks((old) =>
      old.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  }

  // Clear completed tasks
  function handleClearCompleted() {
    if (!tasks.some((item) => item.completed)) return;
    if (!window.confirm('Remove all completed tasks?')) return;

    setTasks((old) => old.filter((item) => !item.completed));
  }

  // Task statistics
  const total = tasks.length;
  const completedCount = tasks.filter((item) => item.completed).length;
  const pendingCount = total - completedCount;
  const overdueCount = tasks.filter(isOverdue).length;
  const progress = total === 0
    ? 0
    : Math.round((completedCount / total) * 100);

  // Search, filter and sort
  const visibleTasks = useMemo(() => {
    const list = tasks
      .filter((item) =>
        item.text.toLowerCase().includes(search.toLowerCase())
      )
      .filter((item) => {
        if (filter === 'completed') return item.completed;
        if (filter === 'pending') return !item.completed;
        if (filter === 'overdue') return isOverdue(item);
        return true;
      })
      .filter((item) =>
        categoryFilter === 'All' ||
        (item.category || 'Other') === categoryFilter
      );

    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        return (
          PRIORITY_ORDER[a.priority || 'Medium'] -
          PRIORITY_ORDER[b.priority || 'Medium']
        );
      }

      if (sortBy === 'newest') return b.id - a.id;

      const aKey = `${a.date || '9999-99-99'} ${to24h(
        a.hour || '09', a.minute || '00', a.period || 'AM'
      )}`;

      const bKey = `${b.date || '9999-99-99'} ${to24h(
        b.hour || '09', b.minute || '00', b.period || 'AM'
      )}`;

      return aKey.localeCompare(bKey);
    });
  }, [tasks, search, filter, categoryFilter, sortBy]);

  return (
    <main className="app">
      <header className="app-header">
        <button
          className="theme-button"
          type="button"
          onClick={() =>
            setTheme((old) => old === 'light' ? 'dark' : 'light')
          }
          aria-label="Toggle dark mode"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <h1>My Todo App</h1>
        <p className="subtitle">Plan your day, one task at a time.</p>
      </header>

      {/* Add or edit form */}
      <form className="task-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="task">Task name</label>
        <input
          id="task"
          type="text"
          placeholder="What do you need to do?"
          value={form.text}
          maxLength={100}
          onChange={(e) => updateField('text', e.target.value)}
        />

        <label htmlFor="date">Due date</label>
        <input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => updateField('date', e.target.value)}
        />

        <label>Due time</label>
        <div className="time-fields">
          <select
            aria-label="Hour"
            value={form.hour}
            onChange={(e) => updateField('hour', e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const value = String(i + 1).padStart(2, '0');
              return <option key={value} value={value}>{value}</option>;
            })}
          </select>

          <span>:</span>

          <select
            aria-label="Minute"
            value={form.minute}
            onChange={(e) => updateField('minute', e.target.value)}
          >
            {Array.from({ length: 60 }, (_, i) => {
              const value = String(i).padStart(2, '0');
              return <option key={value} value={value}>{value}</option>;
            })}
          </select>

          <select
            aria-label="AM or PM"
            value={form.period}
            onChange={(e) => updateField('period', e.target.value)}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <div className="two-col">
          <div>
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => updateField('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="add-button" type="submit">
          {editingId !== null ? 'Save changes' : '+ Add task'}
        </button>

        {editingId !== null && (
          <button
            className="cancel-button"
            type="button"
            onClick={resetForm}
          >
            Cancel edit
          </button>
        )}
      </form>

      {/* Statistics */}
      <section className="stats">
        <div className="stat-card">
          <span>Total</span><strong>{total}</strong>
        </div>
        <div className="stat-card">
          <span>Pending</span><strong>{pendingCount}</strong>
        </div>
        <div className="stat-card">
          <span>Done</span><strong>{completedCount}</strong>
        </div>
        <div className="stat-card danger">
          <span>Overdue</span><strong>{overdueCount}</strong>
        </div>
      </section>

      <div
        className="progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="progress-text">
        {progress}% of tasks completed
      </p>

      {/* Search */}
      <input
        className="search-input"
        type="search"
        placeholder="Search your tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Status filters */}
      <div className="filters">
        {['all', 'pending', 'completed', 'overdue'].map((value) => (
          <button
            key={value}
            type="button"
            className={
              filter === value
                ? 'filter-button active'
                : 'filter-button'
            }
            onClick={() => setFilter(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {/* Category, sort and clear controls */}
      <div className="toolbar">
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          aria-label="Sort tasks"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
        </select>

        <button
          className="clear-button"
          type="button"
          onClick={handleClearCompleted}
          disabled={completedCount === 0}
        >
          Clear completed
        </button>
      </div>

      {/* Task list */}
      <section className="task-list">
        <h2>Your tasks ({visibleTasks.length})</h2>

        {visibleTasks.length === 0 && (
          <p className="empty-message">
            {total === 0
              ? 'No tasks yet. Add your first task above.'
              : 'No tasks match your search or filters.'}
          </p>
        )}

        {visibleTasks.map((item) => {
          const priority = item.priority || 'Medium';
          const overdue = isOverdue(item);

          return (
            <article
              key={item.id}
              className={`task-card priority-${priority.toLowerCase()}${
                item.completed ? ' completed' : ''
              }`}
            >
              <input
                className="task-checkbox"
                type="checkbox"
                checked={item.completed}
                onChange={() => handleCompleteTask(item.id)}
                aria-label={`Mark ${item.text} as completed`}
              />

              <div className="task-info">
                <p className="task-title">{item.text}</p>
                <p className="task-datetime">
                  📅 {formatDate(item.date)}
                </p>
                <p className="task-datetime">
                  🕒 {item.hour || '09'}:{item.minute || '00'} {item.period || 'AM'}
                </p>

                <div className="badges">
                  <span className={
                    item.completed ? 'status done' : 'status pending'
                  }>
                    {item.completed ? 'Completed' : 'Pending'}
                  </span>

                  {overdue && (
                    <span className="status overdue">Overdue</span>
                  )}

                  <span className={`status tag priority-tag-${priority.toLowerCase()}`}>
                    {priority}
                  </span>

                  <span className="status tag">
                    {item.category || 'Other'}
                  </span>
                </div>
              </div>

              <div className="task-actions">
                <button
                  className="edit-button"
                  type="button"
                  onClick={() => handleEditTask(item)}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() => handleDeleteTask(item.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default App;
