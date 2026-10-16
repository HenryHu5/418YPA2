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
// Signup
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
 
// Login
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
// ---------------------------------------------------------------
// PA3: Users list (passwords are NOT sent to the browser)
// ---------------------------------------------------------------
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


//  Create a project and add lead memeber
app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body;
 
    // Required fields
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
 
    // Insert the project
    const result = await projects.insertOne({
      name: name.trim(),
      description: description.trim(),
      status,
      project_lead_id: leadId,
    });
 
    // Insert the lead's membership
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


// Start Express Server on Port 9000
app.listen(9000, () => {
  console.log("Server running on port 9000");
});

