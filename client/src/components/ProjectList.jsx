import { useState, useEffect } from "react";
 
function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
 
  // load projects and users when the page opens
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          fetch("http://localhost:9000/api/projects"),
          fetch("http://localhost:9000/api/users"),
        ]);
 
        const projectsData = await projectsResponse.json();
        const usersData = await usersResponse.json();
 
        if (!projectsResponse.ok) {
          setMessage(projectsData.message || "Could not load projects.");
          return;
        }
        if (!usersResponse.ok) {
          setMessage(usersData.message || "Could not load users.");
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
 
  // turn a project_lead_id into a readable name
  function getLeadName(leadId) {
    const lead = users.find((user) => String(user._id) === String(leadId));
    if (!lead) return "Unknown user";
    return `${lead.f_name} ${lead.l_name} (${lead.username})`;
  }
 
  return (
    <div>
      <h2>Projects</h2>
 
      {message && <p>{message}</p>}
 
      {!message && projects.length === 0 && <p>No projects have been created yet.</p>}
 
      {projects.map((project) => (
        <div key={project._id} style={{ border: "1px solid #888", padding: "10px", margin: "10px 0" }}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <p>
            <strong>Status:</strong> {project.status}
          </p>
          <p>
            <strong>Project Lead:</strong> {getLeadName(project.project_lead_id)}
          </p>
        </div>
      ))}
    </div>
  );
}
 
export default ProjectList;