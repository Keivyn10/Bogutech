const express = require('express');
const pg = require('pg');
pg.defaults.native = false;
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

// --- DATOS INICIALES ---
const initialUsers = [
    { username: 'paola.rangel@bogu-tech.com', password: 'Pao1234', isAdmin: 1 },
    { username: 'mitchell@bogu-tech.com', password: 'Mit123--', isAdmin: 2 },
    { username: 'oscar@bogu-tech.com', password: 'Oscar1234', isAdmin: 1 }
];

// --- FUNCIÓN DE INICIALIZACIÓN COMPLETA Y CORREGIDA ---
async function initializeDb() {
    const client = await pool.connect();
    try {
        console.log("Creando tablas en PostgreSQL si no existen...");
        
        // CORRECCIÓN: Se ha eliminado "DEFAULT 0" de la columna "isAdmin" para evitar el conflicto de tipos.
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                "isAdmin" INTEGER 
            );
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS opportunities (
                "internalId" SERIAL PRIMARY KEY, "idOportunidad" VARCHAR(255) UNIQUE NOT NULL, "portal" VARCHAR(255), 
                "pais" VARCHAR(255), "cliente" VARCHAR(255), "fechaCreacion" DATE, "fechaExpira" DATE, 
                "montoAproximado" NUMERIC(15, 2), "currencySymbol" VARCHAR(5), "estatus" VARCHAR(255), 
                "comercial" VARCHAR(255), "productos" TEXT, "descripcion" TEXT
            );
        `);
        console.log("Estructura de tablas verificada.");

        // Insertar usuarios iniciales si la tabla está vacía
        const usersCount = await client.query('SELECT COUNT(*) FROM users');
        if (usersCount.rows[0].count === '0') {
            console.log("Insertando usuarios iniciales...");
            for (const user of initialUsers) {
                // Aquí se asigna el valor explícitamente, por eso el DEFAULT no es necesario.
                await client.query('INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, $3)', [user.username.toLowerCase(), user.password, user.isAdmin || 0]);
            }
            console.log("Usuarios iniciales insertados.");
        }
        
    } catch (err) {
        console.error('Error al crear/inicializar tablas:', err.stack);
    } finally {
        client.release();
    }
}
initializeDb();

// --- RUTAS DE LA API ---
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

// El resto de los endpoints...

app.listen(PORT, () => console.log(`Servidor de PRODUCCIÓN corriendo en el puerto ${PORT}`));