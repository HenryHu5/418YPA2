import { useEffect, useRef, useState } from "react";
 
const API = "http://localhost:9000";
 
function UserStories() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [stories, setStories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const selectedProjectRef = useRef("");
 
  // load projects and registered users when page opens
  useEffect(() => {
    let active = true;
    async function loadProjectsAndUsers() {
      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          fetch(`${API}/api/projects`),
          fetch(`${API}/api/users`),
        ]);
        const [projectData, userData] = await Promise.all([
          projectsResponse.json(), usersResponse.json(),
        ]);
        if (!projectsResponse.ok || !usersResponse.ok) {
          throw new Error("Could not load projects or users.");
        }
        if (active) {
          setProjects(projectData);
          setUsers(userData);
        }
      } catch (error) {
        if (active) setMessage(error.message || "Could not connect to the server.");
      }
    }
    loadProjectsAndUsers();
    return () => { active = false; };
  }, []);
 
  // load members and backlog whenever the selected project changes
  useEffect(() => {
    let active = true;
    setMembers([]);
    setStories([]);
    setAssignedUserId("");
    if (!selectedProjectId) {
      setLoadingProject(false);
      return () => { active = false; };
    }
    setLoadingProject(true);
    async function loadProjectData() {
      try {
        const [membersResponse, storiesResponse] = await Promise.all([
          fetch(`${API}/api/projects/${selectedProjectId}/members`),
          fetch(`${API}/api/projects/${selectedProjectId}/stories`),
        ]);
        const [membersData, storiesData] = await Promise.all([
          membersResponse.json(), storiesResponse.json(),
        ]);
        if (!membersResponse.ok || !storiesResponse.ok) {
          throw new Error(membersData.message || storiesData.message || "Could not load project data.");
        }
        if (active) {
          setMembers(membersData);
          setStories(storiesData);
        }
      } catch (error) {
        if (active) setMessage(error.message || "Could not load project data.");
      } finally {
        if (active) setLoadingProject(false);
      }
    }
    loadProjectData();
    return () => { active = false; };
  }, [selectedProjectId]);
 
  // clear forms when switching projects
  function handleProjectChange(event) {
    const projectId = event.target.value;
    selectedProjectRef.current = projectId;
    setSelectedProjectId(projectId);
    setMembers([]);
    setStories([]);
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignedUserId("");
    setEditingId(null);
    setEditForm(null);
    setMessage("");
  }
 
  // turn member id into readable name
  function getMemberName(userId) {
    if (!userId) return "Unassigned";
    const user = users.find((u) => String(u._id) === String(userId));
    return user ? `${user.f_name} ${user.l_name} (${user.username})` : "Unknown user";
  }
 
  // refresh stories after creating, editing, or deleting
  async function refreshStories(projectId) {
    const response = await fetch(`${API}/api/projects/${projectId}/stories`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not refresh stories.");
    if (selectedProjectRef.current === projectId) setStories(data);
  }
 
  // send new user story to backend
  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedProjectId || loading) return;
    const projectId = selectedProjectId;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/projects/${projectId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, assigned_user_id: assignedUserId || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create user story.");
      await refreshStories(projectId);
      if (selectedProjectRef.current === projectId) {
        setMessage(data.message || "User story created successfully.");
        setTitle("");
        setDescription("");
        setPriority("Medium");
        setAssignedUserId("");
      }
    } catch (error) {
      if (selectedProjectRef.current === projectId) setMessage(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }
 
  // fill edit form with the story's current information
  function startEdit(story) {
    setEditingId(story._id);
    setEditForm({
      title: story.title,
      description: story.description,
      priority: story.priority,
      status: story.status,
      assigned_user_id: story.assigned_user_id || "",
    });
    setMessage("");
  }
 
  // save changes to an existing story
  async function handleSave(event) {
    event.preventDefault();
    if (!editingId || loading) return;
    const projectId = selectedProjectId;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/projects/${projectId}/stories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, assigned_user_id: editForm.assigned_user_id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update story.");
      await refreshStories(projectId);
      if (selectedProjectRef.current === projectId) {
        setEditingId(null);
        setEditForm(null);
        setMessage(data.message || "User story updated successfully.");
      }
    } catch (error) {
      if (selectedProjectRef.current === projectId) setMessage(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }
 
  // ask for confirmation before deleting a story
  async function handleDelete(story) {
    if (loading || !window.confirm(`Delete "${story.title}"?`)) return;
    const projectId = selectedProjectId;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/projects/${projectId}/stories/${story._id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete story.");
      await refreshStories(projectId);
      if (selectedProjectRef.current === projectId) {
        if (editingId === story._id) {
          setEditingId(null);
          setEditForm(null);
        }
        setMessage(data.message || "User story deleted successfully.");
      }
    } catch (error) {
      if (selectedProjectRef.current === projectId) setMessage(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div>
      <h2>User Stories</h2>
      <div>
        <label htmlFor="story-project">Project: </label>
        <select id="story-project" value={selectedProjectId} onChange={handleProjectChange}>
          <option value="">-- Select a project --</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
      </div>
 
      {/* show creation form after selecting a project */}
      {selectedProjectId && (
        <>
          <h3>Create User Story</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="story-title">Title: </label>
              <input id="story-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="story-description">Description: </label>
              <textarea id="story-description" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="As a [type of user], I want [goal], so that [benefit]." required />
            </div>
            <div>
              <label htmlFor="story-priority">Priority: </label>
              <select id="story-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="story-assignee">Assigned Member: </label>
              <select id="story-assignee" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} disabled={loadingProject}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member._id} value={member.user_id}>{getMemberName(member.user_id)}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading || loadingProject}>{loading ? "Saving..." : "Create User Story"}</button>
          </form>
 
          {/* show all stories for the selected project */}
          <h3>Project Backlog</h3>
          {loadingProject ? <p>Loading stories...</p> : stories.length === 0 ? <p>No user stories for this project.</p> : (
            stories.map((story) => (
              <div key={story._id} style={{ border: "1px solid #888", padding: "10px", margin: "10px 0" }}>
                {editingId === story._id && editForm ? (
                  <form onSubmit={handleSave}>
                    <h4>Edit User Story</h4>
                    <div>
                      <label>Title: <input value={editForm.title} required onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
                    </div>
                    <div>
                      <label>Description: <textarea value={editForm.description} required onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
                    </div>
                    <div>
                      <label>Priority: <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                        <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                      </select></label>
                    </div>
                    <div>
                      <label>Status: <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                        <option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option>
                      </select></label>
                    </div>
                    <div>
                      <label>Assigned Member: <select value={editForm.assigned_user_id} onChange={(e) => setEditForm({ ...editForm, assigned_user_id: e.target.value })}>
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member._id} value={member.user_id}>{getMemberName(member.user_id)}</option>
                        ))}
                      </select></label>
                    </div>
                    <button type="submit" disabled={loading}>Save</button>{" "}
                    <button type="button" disabled={loading} onClick={() => { setEditingId(null); setEditForm(null); setMessage(""); }}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <h4>{story.title}</h4>
                    <p>{story.description}</p>
                    <p><strong>Priority:</strong> {story.priority}</p>
                    <p><strong>Status:</strong> {story.status}</p>
                    <p><strong>Assigned Member:</strong> {getMemberName(story.assigned_user_id)}</p>
                    <button type="button" disabled={loading} onClick={() => startEdit(story)}>Edit</button>{" "}
                    <button type="button" disabled={loading} onClick={() => handleDelete(story)}>Delete</button>
                  </>
                )}
              </div>
            ))
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
 
export default UserStories;