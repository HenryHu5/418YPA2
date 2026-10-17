import { useState, useEffect } from "react";
 
const API = "http://localhost:9000";
 
function ProjectMembers() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [userToAdd, setUserToAdd] = useState("");
  const [message, setMessage] = useState("");
 
  // load projects and users when the page opens
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          fetch(`${API}/api/projects`),
          fetch(`${API}/api/users`),
        ]);
 
        const projectsData = await projectsResponse.json();
        const usersData = await usersResponse.json();
 
        if (!projectsResponse.ok || !usersResponse.ok) {
          setMessage("Could not load projects or users.");
          return;
        }
 
        setProjects(projectsData);
        setUsers(usersData);
      } catch (error) {
        setMessage("Could not connect to the server.");
      }
    }
 
    loadData();
  }, []);
 
  // get the members of one project (also used to refresh after add/remove)
  async function loadMembers(projectId) {
    if (!projectId) {
      setMembers([]);
      return;
    }
 
    try {
      const response = await fetch(`${API}/api/projects/${projectId}/members`);
      const data = await response.json();
 
      if (response.ok) {
        setMembers(data);
      } else {
        setMembers([]);
        setMessage(data.message || "Could not load members.");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  }
 
  function handleSelectProject(event) {
    const projectId = event.target.value;
    setSelectedProjectId(projectId);
    setUserToAdd("");
    setMessage("");
    loadMembers(projectId);
  }
 
  async function handleAddMember() {
    if (!userToAdd) {
      setMessage("Please select a user to add.");
      return;
    }
 
    try {
      const response = await fetch(`${API}/api/projects/${selectedProjectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userToAdd }),
      });
 
      const data = await response.json();
      setMessage(data.message || (response.ok ? "Member added." : "Could not add member."));
 
      if (response.ok) {
        setUserToAdd("");
      }
      // refresh the list either way so it matches the database
      loadMembers(selectedProjectId);
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  }
 
  async function handleRemoveMember(userId) {
    try {
      const response = await fetch(
        `${API}/api/projects/${selectedProjectId}/members/${userId}`,
        { method: "DELETE" }
      );
 
      const data = await response.json();
      setMessage(data.message || (response.ok ? "Member removed." : "Could not remove member."));
 
      loadMembers(selectedProjectId);
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  }
 
  const selectedProject = projects.find(
    (project) => String(project._id) === selectedProjectId
  );
 
  // turn a user id into a readable name
  function getUserName(userId) {
    const user = users.find((u) => String(u._id) === String(userId));
    if (!user) return "Unknown user";
    return `${user.f_name} ${user.l_name} (${user.username})`;
  }
 
  return (
    <div>
      <h2>Manage Project Members</h2>
 
      <div>
        <label>Project: </label>
        <select value={selectedProjectId} onChange={handleSelectProject}>
          <option value="">-- Select a project --</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
 
      {selectedProject && (
        <div>
          <h3>Members of {selectedProject.name}</h3>
 
          {members.length === 0 && <p>This project has no members.</p>}
 
          <ul>
            {members.map((member) => {
              const isLead =
                String(member.user_id) === String(selectedProject.project_lead_id);
 
              return (
                <li key={member._id}>
                  {getUserName(member.user_id)}
                  {isLead ? " — Project Lead" : ""}{" "}
                  {!isLead && (
                    <button onClick={() => handleRemoveMember(member.user_id)}>
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
 
          <h3>Add a member</h3>
          <select value={userToAdd} onChange={(e) => setUserToAdd(e.target.value)}>
            <option value="">-- Select a user --</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.f_name} {user.l_name} ({user.username})
              </option>
            ))}
          </select>{" "}
          <button onClick={handleAddMember}>Add Member</button>
        </div>
      )}
 
      {message && <p>{message}</p>}
    </div>
  );
}
 
export default ProjectMembers;