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
const userStories = db.collection("UserStories");
 
const VALID_STATUSES = ["Planning", "Active", "Completed"];
const priorities = ["High", "Medium", "Low"];
const storyStatuses = ["To Do", "In Progress", "Done"];
 
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
 
    // removal of assigned story

    const assignedStory = await userStories.findOne({
      project_id: projectObjectId,
      assigned_user_id: userObjectId,
    });
    if (assignedStory) {
      return res.status(409).json({
        message: "Reassign, unassign, or delete this member's stories before removing them from the project.",
      });
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
 
// create user story for existinsg project
app.post("/api/projects/:projectId/stories", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assigned_user_id } = req.body || {};

    if (typeof projectId !== "string" || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project identifier." });
    }
    const projectObjectId = new ObjectId(projectId);
    const project = await projects.findOne({ _id: projectObjectId });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    if (!priorities.includes(priority)) {
      return res.status(400).json({ message: "Priority must be High, Medium, or Low." });
    }

    let assignedUserId = null;
    if (assigned_user_id !== null && assigned_user_id !== undefined) {
      if (typeof assigned_user_id !== "string" || !ObjectId.isValid(assigned_user_id)) {
        return res.status(400).json({ message: "Invalid assigned user identifier." });
      }
      assignedUserId = new ObjectId(assigned_user_id);
      const user = await users.findOne({ _id: assignedUserId });
      if (!user) {
        return res.status(404).json({ message: "Assigned user not found." });
      }
      const membership = await memberships.findOne({
        project_id: projectObjectId,
        user_id: assignedUserId,
      });
      if (!membership) {
        return res.status(400).json({ message: "Assigned user must be a member of this project." });
      }
    }

    const story = {
      project_id: projectObjectId,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: storyStatuses[0],
      assigned_user_id: assignedUserId,
    };
    const result = await userStories.insertOne(story);
    return res.status(201).json({ message: "User story created successfully.", story: { ...story, _id: result.insertedId } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while creating user story." });
  }
});

// Get all user stories for one project
app.get("/api/projects/:projectId/stories", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project identifier." });
    }
    const projectObjectId = new ObjectId(projectId);
    if (!await projects.findOne({ _id: projectObjectId })) {
      return res.status(404).json({ message: "Project not found." });
    }

    // include all status
    const stories = await userStories.find({ project_id: projectObjectId }).toArray();
    return res.status(200).json(stories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while loading stories." });
  }
});

// Update a story in the selected project
app.put("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  try {
    const { projectId, storyId } = req.params;
    const { title, description, priority, status, assigned_user_id } = req.body || {};

    // validate project and story identifiers
    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: "Invalid project or story identifier." });
    }
    const projectObjectId = new ObjectId(projectId);
    const storyObjectId = new ObjectId(storyId);
    if (!await projects.findOne({ _id: projectObjectId })) {
      return res.status(404).json({ message: "Project not found." });
    }

    // ensure story belongs to the selected project
    const filter = { _id: storyObjectId, project_id: projectObjectId };
    if (!await userStories.findOne(filter)) {
      return res.status(404).json({ message: "Story not found in this project." });
    }

    // check required fields and allowed values
    if (typeof title !== "string" || !title.trim() ||
        typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    if (!priorities.includes(priority) || !storyStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid priority or story status." });
    }

    // allow unassigned otherwise require a member of this project
    let assignedUserId = null;
    if (assigned_user_id !== null && assigned_user_id !== undefined && assigned_user_id !== "") {
      if (typeof assigned_user_id !== "string" || !ObjectId.isValid(assigned_user_id)) {
        return res.status(400).json({ message: "Invalid assigned user identifier." });
      }
      assignedUserId = new ObjectId(assigned_user_id);
      if (!await users.findOne({ _id: assignedUserId })) {
        return res.status(404).json({ message: "Assigned user not found." });
      }
      if (!await memberships.findOne({ project_id: projectObjectId, user_id: assignedUserId })) {
        return res.status(400).json({ message: "Assigned user must be a member of this project." });
      }
    }

    // do not change the story project id
    const updateResult = await userStories.updateOne(filter, { $set: {
      title: title.trim(), description: description.trim(), priority, status,
      assigned_user_id: assignedUserId,
    } });
    // unchanged values should still succeed
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Story not found in this project." });
    }
    const story = await userStories.findOne(filter);
    return res.status(200).json({ message: "User story updated successfully.", story });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while updating story." });
  }
});

// Delete a story from the selected project
app.delete("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  try {
    const { projectId, storyId } = req.params;
    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: "Invalid project or story identifier." });
    }
    const projectObjectId = new ObjectId(projectId);
    if (!await projects.findOne({ _id: projectObjectId })) {
      return res.status(404).json({ message: "Project not found." });
    }
    // prevent deleting a story belonging to another project
    const result = await userStories.deleteOne({
      _id: new ObjectId(storyId), project_id: projectObjectId,
    });
    if (!result.deletedCount) {
      return res.status(404).json({ message: "Story not found in this project." });
    }
    return res.status(200).json({ message: "User story deleted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while deleting story." });
  }
});

// Start Express Server on Port 9000
app.listen(9000, () => {
  console.log("Server running on port 9000");
});