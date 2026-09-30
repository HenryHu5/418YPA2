require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();

app.use(express.json());
app.use(cors());


const client = new MongoClient(process.env.MONGO_URI);
const users = client.db("PA2").collection("users");

// Connect to MongoDB Atlas
async function connectDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
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

// Start Express Server on Port 9000
app.listen(9000, () => {
  console.log("Server running on port 9000");
});

