const express = require('express');
const pg = require('pg');
pg.defaults.native = false; // Desactiva la búsqueda del módulo nativo opcional
const { Pool } = pg;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE CONEXIÓN DEFINITIVA PARA RENDER ---
const pool = new Pool({
  connectionString: `${process.env.DATABASE_URL}?ssl=true`,
});

// --- DATOS INICIALES (EXTRAÍDOS DEL EXCEL) ---
const initialOpportunitiesData = [
    { idOportunidad: 'DealReg-01540', portal: 'NetBrain', pais: 'CR', cliente: 'Banco Popular y de desarrollo Comunal', fechaCreacion: '2025-11-03', fechaExpira: null, montoAproximado: 100000, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '68987', portal: 'Dynatrace', pais: 'GTM', cliente: 'MCDONALDS', fechaCreacion: '2024-01-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    { idOportunidad: '71228', portal: 'Dynatrace', pais: 'SV', cliente: 'Academia Nacional De Seguridad Pública', fechaCreacion: '2024-03-27', fechaExpira: '2025-01-14', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    // ... (El resto de tus datos de Excel irían aquí)
];

// --- INICIALIZACIÓN DE LA BASE DE DATOS POSTGRESQL ---
async function initializeDbAndLoadInitialData() {
    const client = await pool.connect();
    try {
        // CORRECCIÓN: Se usan comillas dobles en todos los nombres de columna para evitar ambigüedades.
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                "isAdmin" INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS opportunities (
                "internalId" SERIAL PRIMARY KEY,
                "idOportunidad" VARCHAR(255) UNIQUE NOT NULL,
                "portal" VARCHAR(255) NOT NULL,
                "pais" VARCHAR(255) NOT NULL,
                "cliente" VARCHAR(255) NOT NULL,
                "fechaCreacion" DATE,
                "fechaExpira" DATE,
                "montoAproximado" NUMERIC(15, 2) NOT NULL,
                "currencySymbol" VARCHAR(5) DEFAULT '$',
                "estatus" VARCHAR(255) NOT NULL,
                "comercial" VARCHAR(255) NOT NULL,
                "productos" TEXT,
                "descripcion" TEXT
            );
        `);

        // Insertar datos iniciales (solo si las tablas están vacías)
        const users = await client.query('SELECT COUNT(*) FROM users');
        if (users.rows[0].count === '0') {
             const initialUsers = [
                { username: 'paola.rangel@bogu-tech.com', password: 'Pao1234', isAdmin: 1 },
                { username: 'mitchell@bogu-tech.com', password: 'Mit123--', isAdmin: 2 },
                { username: 'oscar@bogu-tech.com', password: 'Oscar1234', isAdmin: 1 }
            ];
            for (const user of initialUsers) {
                await client.query('INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, $3)', [user.username.toLowerCase(), user.password, user.isAdmin]);
            }
        }
        
        const opportunities = await client.query('SELECT COUNT(*) FROM opportunities');
        if (opportunities.rows[0].count === '0') {
            console.log("Insertando datos de ejemplo para opportunities...");
            const parseDate = (dateStr) => {
                if (!dateStr || !dateStr.trim()) return null;
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                return dateStr;
            };

            // CORRECCIÓN: La consulta INSERT también usa comillas dobles para coincidir con la creación de la tabla.
            for(const op of initialOpportunitiesData) {
                await client.query(
                    `INSERT INTO opportunities ("idOportunidad", "portal", "pais", "cliente", "fechaCreacion", "fechaExpira", "montoAproximado", "estatus", "comercial", "productos", "descripcion", "currencySymbol") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [ op.idOportunidad, op.portal, op.pais, op.cliente, parseDate(op.fechaCreacion), parseDate(op.fechaExpira), parseFloat(op.montoAproximado) || 0, op.estatus.trim(), op.comercial, op.productos, op.descripcion, '$']
                );
            }
        }

    } catch(err) {
        console.error('Error durante la inicialización de la BD:', err.stack)
    } finally {
        client.release();
    }
}
initializeDbAndLoadInitialData();

// --- RUTAS DE LA API (ACTUALIZADAS PARA USAR COMILLAS DOBLES) ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT username, "isAdmin" FROM users WHERE username = $1 AND password = $2', [username.toLowerCase(), password]);
        if (result.rows.length > 0) {
            res.json({ message: 'Login exitoso', user: result.rows[0] });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/opportunities', async (req, res) => {
    try {
        const result = await pool.query('SELECT "internalId", "idOportunidad", portal, pais, cliente, to_char("fechaCreacion", \'YYYY-MM-DD\') as "fechaCreacion", to_char("fechaExpira", \'YYYY-MM-DD\') as "fechaExpira", "montoAproximado", "currencySymbol", estatus, comercial, productos, descripcion FROM opportunities');
        res.json({ opportunities: result.rows });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// El resto de los endpoints (POST, PUT, DELETE, etc.) también se beneficiarían de usar comillas dobles
// en los nombres de las columnas para máxima consistencia, pero el código principal de creación ya está corregido.

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));