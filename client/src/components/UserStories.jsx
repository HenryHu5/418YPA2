
import { useEffect, useState } from "react";

const API = "http://localhost:9000";

function UserStories() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
          projectsResponse.json(),
          usersResponse.json(),
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

  // load members whenever a different project is selected
  useEffect(() => {
    let active = true;
    setMembers([]);
    setAssignedUserId("");
    if (!selectedProjectId) return () => { active = false; };

    async function loadMembers() {
      try {
        const response = await fetch(`${API}/api/projects/${selectedProjectId}/members`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load members.");
        if (active) setMembers(data);
      } catch (error) {
        if (active) setMessage(error.message || "Could not load members.");
      }
    }
    loadMembers();
    return () => { active = false; };
  }, [selectedProjectId]);

  // clear form when switching projects
  function handleProjectChange(event) {
    setSelectedProjectId(event.target.value);
    setMembers([]);
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignedUserId("");
    setMessage("");
  }

  // turn member id into readable name
  function getMemberName(userId) {
    const user = users.find((u) => String(u._id) === String(userId));
    return user ? `${user.f_name} ${user.l_name} (${user.username})` : "Unknown user";
  }

  // send new user story to backend
  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedProjectId) {
      setMessage("Please select a project.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/projects/${selectedProjectId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          assigned_user_id: assignedUserId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create user story.");

      // clear fields after successful creation
      setMessage(data.message || "User story created successfully.");
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setAssignedUserId("");
    } catch (error) {
      setMessage(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Create User Story</h2>

      {/* select which project the story belongs to */}
      <div>
        <label htmlFor="story-project">Project: </label>
        <select id="story-project" value={selectedProjectId} onChange={handleProjectChange}>
          <option value="">-- Select a project --</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
      </div>

      {/* show story form after selecting a project */}
      {selectedProjectId && (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="story-title">Title: </label>
            <input id="story-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="story-description">Description: </label>
            <textarea
              id="story-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="As a [type of user], I want [goal], so that [benefit]."
              required
            />
          </div>
          <div>
            <label htmlFor="story-priority">Priority: </label>
            <select id="story-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* only show members of the selected project */}
          <div>
            <label htmlFor="story-assignee">Assigned Member: </label>
            <select id="story-assignee" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member.user_id}>
                  {getMemberName(member.user_id)}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading}>{loading ? "Saving..." : "Create User Story"}</button>
        </form>
      )}

      {/* show success or error message */}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export default UserStories;
