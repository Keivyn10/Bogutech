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

// --- DATOS INICIALES ---
const initialUsers = [
    { username: 'paola.rangel@bogu-tech.com', password: 'Pao1234', isAdmin: 1 },
    { username: 'mitchell@bogu-tech.com', password: 'Mit123--', isAdmin: 2 },
    { username: 'oscar@bogu-tech.com', password: 'Oscar1234', isAdmin: 1 }
];
const initialOpportunitiesData = [
    { idOportunidad: 'DealReg-01540', portal: 'NetBrain', pais: 'CR', cliente: 'Banco Popular', fechaCreacion: '2025-11-03', fechaExpira: null, montoAproximado: 100000, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '68987', portal: 'Dynatrace', pais: 'GTM', cliente: 'MCDONALDS', fechaCreacion: '2024-01-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    { idOportunidad: '71228', portal: 'Dynatrace', pais: 'SV', cliente: 'Academia Nacional De Seguridad Pública', fechaCreacion: '2024-03-27', fechaExpira: '2025-01-14', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Luis Roldan', productos: '', descripcion: '' }
];

// --- FUNCIÓN DE INICIALIZACIÓN COMPLETA ---
async function initializeDb() {
    const client = await pool.connect();
    try {
        console.log("Creando tablas en PostgreSQL si no existen...");
        await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, "isAdmin" INTEGER DEFAULT 0);`);
        await client.query(`CREATE TABLE IF NOT EXISTS opportunities ("internalId" SERIAL PRIMARY KEY, "idOportunidad" VARCHAR(255) UNIQUE NOT NULL, "portal" VARCHAR(255), "pais" VARCHAR(255), "cliente" VARCHAR(255), "fechaCreacion" DATE, "fechaExpira" DATE, "montoAproximado" NUMERIC(15, 2), "currencySymbol" VARCHAR(5), "estatus" VARCHAR(255), "comercial" VARCHAR(255), "productos" TEXT, "descripcion" TEXT);`);
        console.log("Estructura de tablas verificada.");

        // --- BLOQUE PARA INSERTAR USUARIOS (ESTO FALTABA) ---
        const usersCount = await client.query('SELECT COUNT(*) FROM users');
        if (usersCount.rows[0].count === '0') {
            console.log("La tabla de usuarios está vacía. Insertando usuarios iniciales...");
            for (const user of initialUsers) {
                await client.query('INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, $3)', [user.username.toLowerCase(), user.password, user.isAdmin]);
            }
            console.log("Usuarios iniciales insertados.");
        }

        // --- BLOQUE PARA INSERTAR OPORTUNIDADES (ESTO FALTABA) ---
        const opportunitiesCount = await client.query('SELECT COUNT(*) FROM opportunities');
        if (opportunitiesCount.rows[0].count === '0') {
            console.log("La tabla de oportunidades está vacía. Insertando datos de ejemplo...");
            for(const op of initialOpportunitiesData) {
                await client.query(
                    `INSERT INTO opportunities ("idOportunidad", "portal", "pais", "cliente", "fechaCreacion", "fechaExpira", "montoAproximado", "estatus", "comercial", "productos", "descripcion", "currencySymbol") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [ op.idOportunidad, op.portal, op.pais, op.cliente, op.fechaCreacion || null, op.fechaExpira || null, parseFloat(op.montoAproximado) || 0, op.estatus.trim(), op.comercial, op.productos, op.descripcion, '$']
                );
            }
            console.log("Oportunidades de ejemplo insertadas.");
        }

    } catch (err) {
        console.error('Error durante la inicialización de la BD:', err.stack);
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

app.get('/api/opportunities', async (req, res) => {
    try {
        const result = await pool.query('SELECT *, to_char("fechaCreacion", \'YYYY-MM-DD\') as "fechaCreacion", to_char("fechaExpira", \'YYYY-MM-DD\') as "fechaExpira" FROM opportunities ORDER BY "fechaCreacion" DESC');
        res.json({ opportunities: result.rows });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Aquí irían el resto de tus endpoints adaptados a PostgreSQL...

app.listen(PORT, () => console.log(`Servidor de PRODUCCIÓN corriendo en el puerto ${PORT}`));