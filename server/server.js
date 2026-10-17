require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
 
const app = express();
 
app.use(express.json());
app.use(cors());
 
const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("PA2");
const users = db.collection("users");
const projects = db.collection("projects");
const memberships = db.collection("projectMemberships");
 
const VALID_STATUSES = ["Planning", "Active", "Completed"];
 
// Connect to MongoDB Atlas
async function connectDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
 
    // Backup protection against duplicate memberships
    await memberships.createIndex({ project_id: 1, user_id: 1 }, { unique: true });
  } catch (error) {
    console.error("Could not connect to MongoDB");
    console.error(error);
  }
}
 
connectDatabase();
 
// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});
 

app.post("/signup", async (req, res) => {
  try {
    const { f_name, l_name, username, password } = req.body;
 
    if (!f_name || !l_name || !username || !password) {
      return res.status(400).json({ message: "Required information is missing" });
    }
 
    const existing = await users.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }
 
    await users.insertOne({ f_name, l_name, username, password });
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
 
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
 
    if (!username || !password) {
      return res.status(400).json({ message: "Required information is missing" });
    }
 
    const user = await users.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Username does not exist" });
    }
 
    if (user.password !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }
 
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
 

// Users list

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await users
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while loading users." });
  }
});
 

 
// Create a project and add leader as memeber
app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body;
 
    // 1. Required fields
    if (
      !name || !name.trim() ||
      !description || !description.trim() ||
      !status ||
      !project_lead_id
    ) {
      return res
        .status(400)
        .json({ message: "Name, description, status, and project lead are all required." });
    }
 
    if (!VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be Planning, Active, or Completed." });
    }
 
    // Validate the lead id, then verify the user exists
    if (!ObjectId.isValid(project_lead_id)) {
      return res.status(400).json({ message: "Project lead id is not valid." });
    }
 
    const leadId = new ObjectId(project_lead_id);
    const lead = await users.findOne({ _id: leadId });
    if (!lead) {
      return res.status(404).json({ message: "Selected project lead does not exist." });
    }
 
    // Insert the lead's membership
    const result = await projects.insertOne({
      name: name.trim(),
      description: description.trim(),
      status,
      project_lead_id: leadId,
    });
 
    // insert the lead
    try {
      await memberships.insertOne({
        project_id: result.insertedId,
        user_id: leadId,
      });
    } catch (membershipError) {
      // ensure we always have a lead for project
      await projects.deleteOne({ _id: result.insertedId });
      throw membershipError;
    }
 
    res.status(201).json({
      message: "Project created successfully.",
      project_id: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while creating project." });
  }
});
 
// Get all projects
app.get("/api/projects", async (req, res) => {
  try {
    const allProjects = await projects.find({}).toArray();
    res.status(200).json(allProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while loading projects." });
  }
});
 
 
// Get members of one project
app.get("/api/projects/:projectId/members", async (req, res) => {
  try {
    const { projectId } = req.params;
 
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Project id is not valid." });
    }
 
    const projectObjectId = new ObjectId(projectId);
    const project = await projects.findOne({ _id: projectObjectId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
 
    const projectMembers = await memberships
      .find({ project_id: projectObjectId })
      .toArray();
 
    res.status(200).json(projectMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while loading members." });
  }
});
 
// Add a member to a project
app.post("/api/projects/:projectId/members", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { user_id } = req.body;
 
    if (!user_id) {
      return res.status(400).json({ message: "Please select a user to add." });
    }
 
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Project id is not valid." });
    }
    if (!ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "User id is not valid." });
    }
 
    const projectObjectId = new ObjectId(projectId);
    const userObjectId = new ObjectId(user_id);
 
    const project = await projects.findOne({ _id: projectObjectId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
 
    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
 
    const existing = await memberships.findOne({
      project_id: projectObjectId,
      user_id: userObjectId,
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "User is already a member of this project." });
    }
 
    await memberships.insertOne({
      project_id: projectObjectId,
      user_id: userObjectId,
    });
 
    res.status(201).json({ message: "Member added successfully." });
  } catch (error) {
    // 11000 = unique index caught a duplicate 
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "User is already a member of this project." });
    }
    console.error(error);
    res.status(500).json({ message: "Server error while adding member." });
  }
});
 
// Remove a member from a project
app.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
  try {
    const { projectId, userId } = req.params;
 
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Project id is not valid." });
    }
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "User id is not valid." });
    }
 
    const projectObjectId = new ObjectId(projectId);
    const userObjectId = new ObjectId(userId);
 
    const project = await projects.findOne({ _id: projectObjectId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
 
    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
 
    // The project lead can never be removed
    if (project.project_lead_id.equals(userObjectId)) {
      return res
        .status(400)
        .json({ message: "The project lead cannot be removed from the project." });
    }
 
    const result = await memberships.deleteOne({
      project_id: projectObjectId,
      user_id: userObjectId,
    });
 
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "That user is not a member of this project." });
    }
 
    res.status(200).json({ message: "Member removed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while removing member." });
  }
});
 
// Start Express Server on Port 9000
app.listen(9000, () => {
  console.log("Server running on port 9000");
});