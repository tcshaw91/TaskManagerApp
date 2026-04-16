import { useState, useEffect } from "react";
import axios from "axios";

// Use the environment variable if it exists, otherwise fallback to localhost
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const PAGE_SIZE = 5;



const theme = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surfaceHigh: "#22263a",
  border: "#2e3347",
  accent: "#6366f1",
  accentHover: "#818cf8",
  danger: "#ef4444",
  success: "#10b981",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#94a3b8",
};

const s = {
  app: { minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Inter', system-ui, sans-serif" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh",background: theme.bg,minWidth: "100%" },
  card: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 36, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  input: { width: "100%", padding: "10px 14px", background: theme.surfaceHigh, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 10 },
  btn: (color = theme.accent) => ({ background: color, color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "opacity 0.15s" }),
  tag: (active, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? color : theme.border}`, background: active ? color + "22" : "transparent", color: active ? color : theme.textMuted, transition: "all 0.15s" }),
};

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16","#a855f7"];

function getColor(slot) { return COLORS[slot % COLORS.length]; }

export default function App() {

   useEffect(() => {
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.backgroundColor = theme.bg;
}, []);

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [view, setView] = useState("tasks"); // "tasks" | "categories"
  const [filterMask, setFilterMask] = useState(0);
  const [filterMode, setFilterMode] = useState("Any");  // add it here
  const [page, setPage] = useState(0);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskMask, setTaskMask] = useState(0);

  // Category form
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState(null);
  const [editCatName, setEditCatName] = useState("");

  const headers = { Authorization: `Bearer ${token}` };
  function logout() {
    localStorage.removeItem("token");
    setToken(""); setTasks([]); setCategories([]);
  }

 

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [t, c] = await Promise.all([
          axios.get(`${API}/tasks`, { headers }),
          axios.get(`${API}/categories`, { headers }),
        ]);
        setTasks(t.data);
        setCategories(c.data);
      } catch { logout(); }
    };
    load();
  }, [token]);

  

  async function login() {
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Login failed");
      console.error(e);
    }
  }

  async function register() {
    try {
      await axios.post(`${API}/auth/register`, { username, password });
      setUsername(""); setPassword(""); setError("");
      setIsRegistering(false);
      alert("Registered! You can now log in.");
    } catch (e) { setError(e.response?.data?.error || "Registration failed"); }
  }

  async function fetchTasks() {
    const res = await axios.get(`${API}/tasks`, { headers });
    setTasks(res.data);
  }

  async function fetchCategories() {
    const res = await axios.get(`${API}/categories`, { headers });
    setCategories(res.data);
  }

  // --- Task CRUD ---
  function openNewTask() {
    setEditingTask(null); setTaskTitle(""); setTaskDesc(""); setTaskMask(0);
    setShowTaskForm(true);
  }

  function openEditTask(task) {
    setEditingTask(task); setTaskTitle(task.title); setTaskDesc(task.description || "");
    setTaskMask(task.categoryMask || 0); setShowTaskForm(true);
  }

  async function saveTask() {
    if (!taskTitle.trim()) return;
    const payload = { title: taskTitle, description: taskDesc, completed: editingTask?.completed || false, categoryMask: taskMask };
    if (editingTask) {
      await axios.put(`${API}/tasks/${editingTask.id}`, payload, { headers });
    } else {
      await axios.post(`${API}/tasks`, payload, { headers });
    }
    setShowTaskForm(false); setPage(0);
    await fetchTasks();
  }

  async function toggleComplete(task) {
    await axios.put(`${API}/tasks/${task.id}`, { ...task, completed: !task.completed }, { headers });
    await fetchTasks();
  }

  async function deleteTask(id) {
    await axios.delete(`${API}/tasks/${id}`, { headers });
    await fetchTasks();
  }

  // --- Category CRUD ---
  async function createCategory() {
    if (!newCatName.trim() || categories.length >= 32) return;
    const usedSlots = new Set(categories.map(c => c.slot));
    const slot = [...Array(32).keys()].find(i => !usedSlots.has(i));
    await axios.post(`${API}/categories`, { name: newCatName, slot }, { headers });
    setNewCatName("");
    await fetchCategories();
  }

  async function saveEditCat(cat) {
    await axios.put(`${API}/categories/${cat.id}`, { name: editCatName, slot: cat.slot }, { headers });
    setEditingCat(null);
    await fetchCategories();
  }

  async function deleteCat(id) {
    await axios.delete(`${API}/categories/${id}`, { headers });
    await fetchCategories();
  }

  // --- Filtering + Pagination ---
  function toggleFilter(slot) {
    setFilterMask(prev => prev ^ (1 << slot));
    setPage(0);
  }

  function toggleTaskCat(slot) {
    setTaskMask(prev => prev ^ (1 << slot));
  }

  const filteredTasks = tasks.filter(task => {
    if (filterMask === 0) return true;
    if (filterMode === "All") return (task.categoryMask & filterMask) === filterMask;
    return (task.categoryMask & filterMask) !== 0;
  });
  

  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const visibleTasks = filteredTasks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // ---- AUTH SCREEN ----
  if (!token) return (
    <div style={s.center}>
      <div style={s.card}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, color: theme.text }}>📝 Task Tracker</h2>
        <p style={{ color: theme.textMuted, marginTop: 0, marginBottom: 24, fontSize: 14 }}>{isRegistering ? "Create an account" : "Sign in to continue"}</p>
        {error && <p style={{ color: theme.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <input style={s.input} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input style={s.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (isRegistering ? register() : login())} />
        <button style={{ ...s.btn(), width: "100%", marginBottom: 12 }} onClick={isRegistering ? register : login}>
          {isRegistering ? "Register" : "Login"}
        </button>
        <p style={{ color: theme.accent, cursor: "pointer", fontSize: 13, textAlign: "center", margin: 0 }}
          onClick={() => { setIsRegistering(!isRegistering); setError(""); }}>
          {isRegistering ? "Already have an account? Login" : "No account? Register"}
        </p>
      </div>
    </div>
  );

  // ---- MAIN APP ----
  return (
    <div style={s.app}>
      {/* Navbar */}
      <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["tasks", "categories"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? theme.surfaceHigh : "transparent", color: view === v ? theme.text : theme.textMuted, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
              {v === "tasks" ? "📋 Tasks" : "🏷️ Categories"}
            </button>
          ))}
        </div>
        <button style={{ ...s.btn(theme.surfaceHigh), color: theme.textDim, fontSize: 13 }} onClick={logout}>Logout</button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px" }}>

        {/* ---- TASKS VIEW ---- */}
        {view === "tasks" && (<>
          {/* Filter bar */}
          {categories.length > 0 && (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, alignItems: "center" }}>
    <span style={{ color: theme.textMuted, fontSize: 13 }}>Filter:</span>
    {categories.sort((a,b) => a.slot - b.slot).map(cat => {
      const active = (filterMask & (1 << cat.slot)) !== 0;
      return (
        <span key={cat.id} style={s.tag(active, getColor(cat.slot))} onClick={() => toggleFilter(cat.slot)}>
          {active ? "✓ " : ""}{cat.name}
        </span>
      );
    })}
    { (<>
      <span style={s.tag(false, theme.danger)} onClick={() => {setFilterMask(0); setFilterMode("Any");}}>✕ Clear</span>
      {/* Mode toggle — only meaningful when 2+ categories selected */}
      { (
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, marginLeft: 4 }}>
          {["Any", "All"].map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              style={{ background: filterMode === mode ? theme.accent : theme.surfaceHigh, color: filterMode === mode ? "#fff" : theme.textMuted, border: "none", padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {mode}
            </button>
          ))}
        </div>
      )}
    </>)}
  </div>
)}

          {/* Add task button */}
          <button style={{ ...s.btn(), marginBottom: 20 }} onClick={openNewTask}>+ New Task</button>

          {/* Task form */}
          {showTaskForm && (
            <div style={{ background: theme.surfaceHigh, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>{editingTask ? "Edit Task" : "New Task"}</h3>
              <input style={s.input} placeholder="Title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <input style={s.input} placeholder="Description (optional)" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
              {categories.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ color: theme.textMuted, fontSize: 13, margin: "0 0 8px" }}>Categories:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {categories.sort((a,b) => a.slot - b.slot).map(cat => {
                      const active = (taskMask & (1 << cat.slot)) !== 0;
                      return (
                        <span key={cat.id} style={s.tag(active, getColor(cat.slot))} onClick={() => toggleTaskCat(cat.slot)}>
                          {active ? "✓ " : ""}{cat.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btn()} onClick={saveTask}>Save</button>
                <button style={s.btn(theme.surfaceHigh)} onClick={() => setShowTaskForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Task list */}
          {filteredTasks.length === 0
            ? <p style={{ color: theme.textMuted, textAlign: "center", marginTop: 40 }}>No tasks{filterMask ? " matching filter" : ""}. {filterMask === 0 && "Add one above!"}</p>
            : visibleTasks.map(task => {
              const taskCats = categories.filter(c => (task.categoryMask & (1 << c.slot)) !== 0);
              return (
                <div key={task.id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 15, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? theme.textMuted : theme.text }}>
                      {task.title}
                    </p>
                    {task.description && <p style={{ margin: "0 0 8px", color: theme.textDim, fontSize: 13 }}>{task.description}</p>}
                    {taskCats.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {taskCats.map(c => <span key={c.id} style={s.tag(true, getColor(c.slot))}>{c.name}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                    <button style={{ ...s.btn(task.completed ? theme.surfaceHigh : theme.success), padding: "5px 10px", fontSize: 12 }} onClick={() => toggleComplete(task)}>
                      {task.completed ? "Undo" : "✓"}
                    </button>
                    <button style={{ ...s.btn(theme.surfaceHigh), padding: "5px 10px", fontSize: 12 }} onClick={() => openEditTask(task)}>Edit</button>
                    <button style={{ ...s.btn(theme.danger), padding: "5px 10px", fontSize: 12 }} onClick={() => deleteTask(task.id)}>✕</button>
                  </div>
                </div>
              );
            })
          }

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
              <button style={{ ...s.btn(theme.surfaceHigh), padding: "6px 16px", opacity: page === 0 ? 0.4 : 1 }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
              <span style={{ color: theme.textMuted, fontSize: 14 }}>Page {page + 1} of {totalPages}</span>
              <button style={{ ...s.btn(theme.surfaceHigh), padding: "6px 16px", opacity: page >= totalPages - 1 ? 0.4 : 1 }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next →</button>
            </div>
          )}
        </>)}

        {/* ---- CATEGORIES VIEW ---- */}
        {view === "categories" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20,color: theme.text }}>🏷️ Categories</h2>
            <span style={{ color: theme.textMuted, fontSize: 13 }}>{categories.length}/32 used</span>
          </div>

          {categories.length < 32 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="New category name" value={newCatName}
                onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && createCategory()} />
              <button style={s.btn()} onClick={createCategory}>Add</button>
            </div>
          )}

          {categories.length === 0 && <p style={{ color: theme.textMuted, textAlign: "center", marginTop: 40 }}>No categories yet. Add one above!</p>}

          {categories.sort((a,b) => a.slot - b.slot).map(cat => (
            <div key={cat.id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 20px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: getColor(cat.slot), flexShrink: 0 }} />
              {editingCat === cat.id
                ? <>
                    <input style={{ ...s.input, marginBottom: 0, flex: 1 }} value={editCatName} onChange={e => setEditCatName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEditCat(cat)} autoFocus />
                    <button style={{ ...s.btn(), padding: "6px 12px", fontSize: 13 }} onClick={() => saveEditCat(cat)}>Save</button>
                    <button style={{ ...s.btn(theme.surfaceHigh), padding: "6px 12px", fontSize: 13 }} onClick={() => setEditingCat(null)}>Cancel</button>
                  </>
                : <>
                    <span style={{ flex: 1, fontWeight: 500 }}>{cat.name}</span>
                    <button style={{ ...s.btn(theme.surfaceHigh), padding: "5px 10px", fontSize: 12 }} onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }}>Rename</button>
                    <button style={{ ...s.btn(theme.danger), padding: "5px 10px", fontSize: 12 }} onClick={() => deleteCat(cat.id)}>✕</button>
                  </>
              }
            </div>
          ))}
        </>)}

      </div>
    </div>
  );
}