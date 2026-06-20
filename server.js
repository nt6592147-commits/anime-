const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Tells server to load your index.html

// Initialize SQLite Database
const db = new sqlite3.Database('./cineanime.db', (err) => {
    if (err) console.error("Database Error:", err.message);
    else {
        console.log("✅ Database connected!");
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE, email TEXT UNIQUE, password TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER, anime_title TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anime_title TEXT, username TEXT, rating INTEGER, review_text TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

// --- API: SIGN UP ---
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, 
            [username, email, hashedPassword], 
            function(err) {
                if (err) return res.status(400).json({ error: "Username or Email taken!" });
                res.json({ message: "Account created!", userId: this.lastID, username });
            }
        );
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// --- API: SIGN IN ---
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: "User not found!" });
        const match = await bcrypt.compare(password, user.password);
        if (match) res.json({ message: "Logged in", userId: user.id, username: user.username });
        else res.status(400).json({ error: "Wrong password!" });
    });
});

// --- API: WATCHLIST ---
app.post('/api/watchlist', (req, res) => {
    db.run(`INSERT INTO watchlist (user_id, anime_title) VALUES (?, ?)`, 
        [req.body.userId, req.body.animeTitle], 
        function(err) { res.json({ message: "Added!", id: this.lastID }); }
    );
});

app.get('/api/watchlist/:userId', (req, res) => {
    db.all(`SELECT * FROM watchlist WHERE user_id = ?`, [req.params.userId], (err, rows) => {
        res.json(rows);
    });
});

app.delete('/api/watchlist/:id', (req, res) => {
    db.run(`DELETE FROM watchlist WHERE id = ?`, [req.params.id], () => {
        res.json({ message: "Removed!" });
    });
});

// --- API: REVIEWS ---
app.post('/api/reviews', (req, res) => {
    const { animeTitle, username, rating, reviewText } = req.body;
    db.run(`INSERT INTO reviews (anime_title, username, rating, review_text) VALUES (?, ?, ?, ?)`, 
        [animeTitle, username, rating, reviewText], 
        () => { res.json({ message: "Review added!" }); }
    );
});

app.get('/api/reviews/:animeTitle', (req, res) => {
    db.all(`SELECT * FROM reviews WHERE anime_title = ? ORDER BY created_at DESC`, [req.params.animeTitle], (err, rows) => {
        res.json(rows);
    });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));