const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

console.log("Iniciando servidor en MODO LOCAL con SQLite.");

// --- LÓGICA PARA LOCAL (SQLITE) ---
const DB_PATH = path.join(__dirname, 'data', 'opportunities.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error('Error al conectar a SQLite:', err.message);
    }
    console.log('Conectado a la base de datos SQLite local.');
    initializeSqliteDb();
});

function initializeSqliteDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, isAdmin INTEGER DEFAULT 0)`);
        db.run(`CREATE TABLE IF NOT EXISTS opportunities (internalId INTEGER PRIMARY KEY AUTOINCREMENT, idOportunidad TEXT UNIQUE NOT NULL, portal TEXT, pais TEXT, cliente TEXT, fechaCreacion TEXT, fechaExpira TEXT, montoAproximado REAL, currencySymbol TEXT, estatus TEXT, comercial TEXT, productos TEXT, descripcion TEXT)`);
        // ... aquí podrías añadir lógica para poblar la BD local si está vacía
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- RUTAS DE LA API (versión SQLite) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/login', (req, res) => {
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [req.body.username.toLowerCase(), req.body.password], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (row) {
            res.json({ message: 'Login exitoso', user: { username: row.username, isAdmin: row.isAdmin } });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }
    });
});

app.get('/api/opportunities', (req, res) => {
    db.all(`SELECT * FROM opportunities`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ opportunities: rows || [] });
    });
});

app.post('/api/opportunities', (req, res) => {
    const { idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion } = req.body;
    const sql = `INSERT INTO opportunities (idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion];
    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: `Ya existe una oportunidad con el ID: ${idOportunidad}` });
            }
            return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ message: 'Oportunidad creada', internalId: this.lastID });
    });
});

// ... (Aquí irían el resto de tus endpoints para SQLite si los necesitas para probar)

app.listen(PORT, () => {
    console.log(`Servidor LOCAL corriendo en http://localhost:${PORT}`);
});