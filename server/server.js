require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();

app.use(express.json());
app.use(cors());

// Create MongoDB Client using the URI from your .env file
const client = new MongoClient(process.env.MONGO_URI);

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

// Start Express Server on Port 9000
app.listen(9000, () => {
  console.log("Server running on port 9000");
});