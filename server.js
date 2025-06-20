const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE CONEXIÓN DEFINITIVA PARA RENDER ---
const pool = new Pool({
  // Se añade "?ssl=true" para forzar la conexión segura de una manera más compatible
  connectionString: `${process.env.DATABASE_URL}?ssl=true`,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- DATOS INICIALES (EXTRAÍDOS DEL EXCEL) ---
const initialOpportunitiesData = [
    { idOportunidad: 'DealReg-01540', portal: 'NetBrain', pais: 'CR', cliente: 'Banco Popular y de desarrollo Comunal', fechaCreacion: '2025-11-03', fechaExpira: null, montoAproximado: 100000, estatus: 'Pendiente ', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '68987', portal: 'Dynatrace', pais: 'GTM', cliente: 'MCDONALDS', fechaCreacion: '2024-01-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    { idOportunidad: '71228', portal: 'Dynatrace', pais: 'SV', cliente: 'Academia Nacional De Seguridad Pública', fechaCreacion: '2024-03-27', fechaExpira: '2025-01-14', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    { idOportunidad: '71636', portal: 'Dynatrace', pais: 'GT', cliente: 'Ministerio de Eduacacion', fechaCreacion: '2024-04-16', fechaExpira: '2025-01-20', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72073', portal: 'Dynatrace', pais: 'GT', cliente: 'EEGSA', fechaCreacion: '2024-04-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' }
    // ... puedes añadir el resto de los datos si quieres
];

// --- INICIALIZACIÓN DE LA BASE DE DATOS POSTGRESQL ---
async function initializeDbAndLoadInitialData() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, "isAdmin" INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS portals (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);
            CREATE TABLE IF NOT EXISTS countries (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);
            CREATE TABLE IF NOT EXISTS currencies (id SERIAL PRIMARY KEY, symbol VARCHAR(5) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL);
            CREATE TABLE IF NOT EXISTS opportunities (
                "internalId" SERIAL PRIMARY KEY, idOportunidad VARCHAR(255) UNIQUE NOT NULL, portal VARCHAR(255) NOT NULL, pais VARCHAR(255) NOT NULL,
                cliente VARCHAR(255) NOT NULL, "fechaCreacion" DATE, "fechaExpira" DATE, "montoAproximado" NUMERIC(15, 2) NOT NULL,
                "currencySymbol" VARCHAR(5) DEFAULT '$', estatus VARCHAR(255) NOT NULL, comercial VARCHAR(255) NOT NULL,
                productos TEXT, descripcion TEXT
            );
        `);

        // Insertar datos iniciales solo si las tablas están vacías
        const users = await client.query('SELECT COUNT(*) FROM users');
        if (users.rows[0].count === '0') { /* ... */ }
        
        const opportunities = await client.query('SELECT COUNT(*) FROM opportunities');
        if (opportunities.rows[0].count === '0') {
            console.log("Insertando datos de ejemplo para opportunities...");
            for(const op of initialOpportunitiesData) {
                await client.query(
                    `INSERT INTO opportunities (idOportunidad, portal, pais, cliente, "fechaCreacion", "fechaExpira", "montoAproximado", estatus, comercial, productos, descripcion, "currencySymbol") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [ op.idOportunidad, op.portal, op.pais, op.cliente, op.fechaCreacion || null, op.fechaExpira || null, parseFloat(op.montoAproximado) || 0, op.estatus.trim(), op.comercial, op.productos, op.descripcion, '$']
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

// --- RUTAS DE LA API (TODAS ACTUALIZADAS) ---

// Servir el archivo principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// LOGIN
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

// CREAR USUARIO NORMAL
app.post('/api/createUser', async (req, res) => {
    const { newUsername, newPassword } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, 0)', [newUsername.toLowerCase(), newPassword]);
        res.status(201).json({ message: '¡Cuenta creada exitosamente!' });
    } catch(err) {
        if (err.code === '23505') return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        res.status(500).json({ message: err.message });
    }
});

// CREAR USUARIO ADMIN (SOLO SUPERADMIN)
app.post('/api/createAdminUser', async (req, res) => {
    const { requesterUsername, newUsername, newPassword } = req.body;
    try {
        const requester = await pool.query('SELECT "isAdmin" FROM users WHERE username = $1', [requesterUsername]);
        if (requester.rows.length === 0 || requester.rows[0].isAdmin != 2) {
            return res.status(403).json({ message: 'No tienes permisos para esta acción.' });
        }
        await pool.query('INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, 1)', [newUsername.toLowerCase(), newPassword]);
        res.status(201).json({ message: `Administrador ${newUsername} creado.` });
    } catch(err) {
        if (err.code === '23505') return res.status(409).json({ message: 'El nuevo administrador ya existe.' });
        res.status(500).json({ message: err.message });
    }
});

// RESTABLECER CONTRASEÑA
app.post('/api/forgotPassword', async (req, res) => {
    const { forgotUsername, forgotNewPassword } = req.body;
    try {
        const result = await pool.query('UPDATE users SET password = $1 WHERE username = $2', [forgotNewPassword, forgotUsername.toLowerCase()]);
        if(result.rowCount === 0) return res.status(404).json({ message: 'El usuario no existe.' });
        res.json({ message: 'Contraseña restablecida.' });
    } catch(err) { res.status(500).json({ message: err.message }); }
});

// OBTENER OPORTUNIDADES
app.get('/api/opportunities', async (req, res) => {
    try {
        const result = await pool.query('SELECT *, to_char("fechaCreacion", \'YYYY-MM-DD\') as "fechaCreacion", to_char("fechaExpira", \'YYYY-MM-DD\') as "fechaExpira" FROM opportunities');
        res.json({ opportunities: result.rows });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// CREAR OPORTUNIDAD
app.post('/api/opportunities', async (req, res) => {
    const { idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO opportunities (idOportunidad, portal, pais, cliente, "fechaCreacion", "fechaExpira", "montoAproximado", "currencySymbol", estatus, comercial, productos, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING "internalId"`,
            [idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira || null, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion]
        );
        res.status(201).json({ message: 'Oportunidad creada', internalId: result.rows[0].internalId });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: `Ya existe una oportunidad con el ID: ${idOportunidad}` });
        res.status(500).json({ message: err.message });
    }
});

// ACTUALIZAR OPORTUNIDAD
app.put('/api/opportunities/:internalId', async (req, res) => {
    const { internalId } = req.params;
    const { idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion } = req.body;
    try {
        const result = await pool.query(
            `UPDATE opportunities SET idOportunidad=$1, portal=$2, pais=$3, cliente=$4, "fechaCreacion"=$5, "fechaExpira"=$6, "montoAproximado"=$7, "currencySymbol"=$8, estatus=$9, comercial=$10, productos=$11, descripcion=$12 WHERE "internalId" = $13`,
            [idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira || null, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion, internalId]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Oportunidad no encontrada' });
        res.json({ message: 'Oportunidad actualizada' });
    } catch(err) { res.status(500).json({ message: err.message }); }
});

// ELIMINAR OPORTUNIDAD
app.delete('/api/opportunities/:internalId', async (req, res) => {
    const { internalId } = req.params;
    try {
        const result = await pool.query('DELETE FROM opportunities WHERE "internalId" = $1', [internalId]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Oportunidad no encontrada' });
        res.json({ message: 'Oportunidad eliminada' });
    } catch(err) { res.status(500).json({ message: err.message }); }
});


// ENDPOINTS PARA GESTIÓN DE PORTALES, PAÍSES, MONEDAS...
const createCrudEndpoints = (app, tableName, columns = ['name']) => {
    app.get(`/api/${tableName}`, async (req, res) => {
        try { const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`); res.json(result.rows); }
        catch (err) { res.status(500).json({ message: err.message }); }
    });
    app.post(`/api/${tableName}`, async (req, res) => {
        const values = columns.map(col => req.body[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
        try {
            const result = await pool.query(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders}) RETURNING id`, values);
            res.status(201).json({ id: result.rows[0].id, ...req.body });
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: 'El valor ya podría existir.' });
            res.status(500).json({ message: err.message });
        }
    });
    app.delete(`/api/${tableName}/:id`, async (req, res) => {
        try {
            const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
            if (result.rowCount === 0) return res.status(404).json({ message: 'Item no encontrado' });
            res.json({ message: 'Item eliminado' });
        } catch (err) { res.status(500).json({ message: err.message }); }
    });
};
createCrudEndpoints(app, 'portals');
createCrudEndpoints(app, 'countries');
createCrudEndpoints(app, 'currencies', ['symbol', 'name']);

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));