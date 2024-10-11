// server/index.js
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "..", "pages")));
app.use(express.static(path.join(__dirname, "..", "img")));

const JWT_SECRET = "your_jwt_secret_key"; // Use a more secure secret in production

// MySQL connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Update with your MySQL password
  database: "road_accident_db",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    throw err;
  }
  console.log("Connected to MySQL database");
});

// Routes

// Report accident endpoint
app.post("/api/report-accident", (req, res) => {
  const {
    location,
    latitude,
    longitude,
    date,
    time,
    severity,
    vehicles,
    accidentType,
  } = req.body;

  const query =
    "INSERT INTO accidents (location, latitude, longitude, date, time, severity, vehicles, accidentType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

  connection.query(
    query,
    [
      location,
      latitude,
      longitude,
      date,
      time,
      severity,
      vehicles,
      accidentType,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting accident:", err);
        res.status(500).json({ error: "Error reporting accident" });
      } else {
        res.status(200).json({ message: "Accident reported successfully" });
      }
    }
  );
});

// Fetch accidents endpoint
app.get("/api/accidents", (req, res) => {
  const query = "SELECT * FROM accidents";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching accidents:", err);
      res.status(500).json({ error: "Error fetching accidents" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Signup route with password hashing
app.post("/api/signup", async (req, res) => {
  const { name, username, email, password, contact, address } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO users (name, username, email, password, contact, address) VALUES (?, ?, ?, ?, ?, ?)";
    connection.query(
      query,
      [name, username, email, hashedPassword, contact, address],
      (err, result) => {
        if (err) {
          console.error("Error inserting user:", err);
          res.status(500).json({ error: "Signup failed. Please try again." });
        } else {
          res.status(201).json({ message: "Signup successful!" });
        }
      }
    );
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

// Login route with password hashing verification
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ? OR email = ?";
  connection.query(query, [identifier, identifier], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Login failed. Please try again." });
    } else if (results.length === 1) {
      const user = results[0];
      // Compare provided password with hashed password
      bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
        if (bcryptErr) {
          console.error("Error comparing passwords:", bcryptErr);
          res.status(500).json({ error: "Login failed. Please try again." });
        } else if (bcryptResult) {
          // Fetch user details and send them back
          const userDetailsQuery = "SELECT * FROM users WHERE id = ?";
          connection.query(userDetailsQuery, [user.id], (err, userDetails) => {
            if (err) {
              console.error("Error fetching user details:", err);
              res
                .status(500)
                .json({ error: "Login failed. Please try again." });
            } else {
              const userData = {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                contact: user.contact,
                address: user.address,
                // Add other necessary user details
              };
              res.status(200).json(userData);
            }
          });
        } else {
          res.status(401).json({ error: "Incorrect password" });
        }
      });
    } else {
      res.status(401).json({ error: "User not found" });
    }
  });
});

app.get("/api/user/:username", (req, res) => {
  const username = req.params.username; // Corrected: get the username from the request parameters

  const query = "SELECT * FROM users WHERE username = ?";
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: 'Internal server error' });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      const user = results[0];
      res.status(200).json(user);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});