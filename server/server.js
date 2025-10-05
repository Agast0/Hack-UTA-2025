const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/user.model");

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connection established successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.post("/api/register", async (req, res) => {
  console.log("Received user data:", req.body);
  const { email, name, picture, sub } = req.body;
  /** Test Payload
     {
       "email": "testuser@example.com",
       "name": "Test User",
       "picture": "https://s.gravatar.com/avatar/example?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Ftu.png",
       "sub": "auth0|67890abcdef12345"
     }
  */

  if (!sub || !email) {
    return res
      .status(400)
      .json({ message: "Auth0 ID and email are required." });
  }

  try {
    const user = await User.findOneAndUpdate(
      { auth0Id: sub },
      {
        $setOnInsert: { auth0Id: sub, email, name, picture },
      },
      {
        new: true,
        upsert: true,
      },
    );
    res.status(200).json({ message: "User synced successfully", user });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ message: "Error syncing user", error });
  }
});

app.get("/api/user/:auth0Id", async (req, res) => {
  try {
    const { auth0Id } = req.params;
    // http://localhost:8080/api/user/auth0|67890abcdef12345
    const user = await User.findOne({ auth0Id: auth0Id });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user", error });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
