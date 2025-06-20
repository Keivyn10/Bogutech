const express = require('express');
const pg = require('pg');
pg.defaults.native = false; // Desactiva la búsqueda del módulo nativo opcional
const { Pool } = pg;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de conexión para Render
const pool = new Pool({
  connectionString: `${process.env.DATABASE_URL}?ssl=true`,
});

console.log("Iniciando servidor en MODO PRODUCCIÓN (Render).");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Función para inicializar la base de datos PostgreSQL
async function initializeDb() {
    const client = await pool.connect();
    try {
        console.log("Creando tablas en PostgreSQL si no existen...");
        
        await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, "isAdmin" INTEGER DEFAULT 0);`);
        await client.query(`CREATE TABLE IF NOT EXISTS opportunities ("internalId" SERIAL PRIMARY KEY, "idOportunidad" VARCHAR(255) UNIQUE NOT NULL, "portal" VARCHAR(255), "pais" VARCHAR(255), "cliente" VARCHAR(255), "fechaCreacion" DATE, "fechaExpira" DATE, "montoAproximado" NUMERIC(15, 2), "currencySymbol" VARCHAR(5), "estatus" VARCHAR(255), "comercial" VARCHAR(255), "productos" TEXT, "descripcion" TEXT);`);
        
        console.log("Estructura de tablas verificada.");
    } catch (err) {
        console.error('Error al crear tablas en PostgreSQL:', err.stack);
    } finally {
        client.release();
    }
}
initializeDb();

// --- RUTAS DE LA API (Versión PostgreSQL) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/login', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [req.body.username.toLowerCase(), req.body.password]);
        if (result.rows.length > 0) {
            res.json({ message: 'Login exitoso', user: { username: result.rows[0].username, isAdmin: result.rows[0].isAdmin } });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/opportunities', async (req, res) => {
    try {
        const result = await pool.query('SELECT *, to_char("fechaCreacion", \'YYYY-MM-DD\') as "fechaCreacion", to_char("fechaExpira", \'YYYY-MM-DD\') as "fechaExpira" FROM opportunities ORDER BY "fechaCreacion" DESC');
        res.json({ opportunities: result.rows });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Aquí irían el resto de tus endpoints adaptados a PostgreSQL...

app.listen(PORT, () => console.log(`Servidor de PRODUCCIÓN corriendo en el puerto ${PORT}`));