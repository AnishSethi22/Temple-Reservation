const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', // Update with your MySQL user
    password: process.env.DB_PASSWORD || 'root', // Update with your MySQL password
    database: 'temple_reservation', // Specify the database name directly
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Exit if connection fails
    }
    console.log('Connected to MySQL database.');

    // Create reservations table if it doesn't exist
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            is_vip TINYINT(1) DEFAULT 0
        )`;

    db.query(createTableQuery, err => {
        if (err) {
            console.error('Error creating table:', err);
        }
    });
});

// Sanitize input function to prevent SQL injection and XSS
function sanitizeInput(data) {
    return data ? data.replace(/<[^>]+>/g, '') : '';
}

// Convert time to 24-hour format
function convertTo24HourFormat(time) {
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (modifier.toLowerCase() === 'pm' && hours < 12) {
        hours += 12; // Convert PM hour to 24-hour format
    } else if (modifier.toLowerCase() === 'am' && hours === 12) {
        hours = 0; // Convert 12 AM to 0 hours
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`; // Return in HH:MM:SS format
}

// Handle POST request to add reservation
app.post('/api/reservations', (req, res) => {
    const name = sanitizeInput(req.body.name);
    const date = sanitizeInput(req.body.date);
    let time = sanitizeInput(req.body.time);
    const isVip = req.body.is_vip ? 1 : 0;

    // Validate input
    if (!name || !date || !time) {
        return res.status(400).json({ status: 'error', message: 'Name, date, and time are required.' });
    }

    // Convert time to 24-hour format
    time = convertTo24HourFormat(time);

    const query = 'INSERT INTO reservations (name, date, time, is_vip) VALUES (?, ?, ?, ?)';
    db.query(query, [name, date, time, isVip], err => {
        if (err) {
            console.error('Error adding reservation:', err);
            return res.status(500).json({ status: 'error', message: 'Error adding reservation: ' + err.message });
        }
        res.status(201).json({ status: 'success', message: 'Reservation added successfully.' });
    });
});

// Handle GET request to fetch reservations
app.get('/api/reservations', (req, res) => {
    db.query('SELECT * FROM reservations', (err, results) => {
        if (err) {
            console.error('Error fetching reservations:', err);
            return res.status(500).json({ status: 'error', message: 'Error fetching reservations: ' + err.message });
        }
        res.json({ status: 'success', data: results }); // Include a status in the response
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'An unexpected error occurred' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
