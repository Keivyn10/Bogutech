require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuración del pool de conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Render.com
  }
});

// Usuarios iniciales
const initialUsers = [
  { username: 'mitchell@bogu-tech.com', password: 'Mit123--', isAdmin: 2 },
  { username: 'oscar@bogu-tech.com', password: 'Oscar1234', isAdmin: 1 }
];

// Oportunidades iniciales
const initialOpportunitiesData = [
  { idOportunidad: 'DealReg-01540', portal: 'NetBrain', pais: 'CR', cliente: 'Banco Popular', fechaCreacion: '2025-11-03', fechaExpira: null, montoAproximado: 100000, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
  { idOportunidad: '68987', portal: 'Dynatrace', pais: 'GTM', cliente: 'MCDONALDS', fechaCreacion: '2024-01-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Luis Roldan', productos: '', descripcion: '' },
  { idOportunidad: '71228', portal: 'Dynatrace', pais: 'SV', cliente: 'Academia Nacional De Seguridad Pública', fechaCreacion: '2024-03-27', fechaExpira: '2025-01-14', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Luis Roldan', productos: '', descripcion: '' }
];

// Inicialización de la base de datos
async function initializeDb() {
  const client = await pool.connect();
  try {
    console.log("Creando tablas si no existen...");

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
        "internalId" SERIAL PRIMARY KEY,
        "idOportunidad" VARCHAR(255) UNIQUE NOT NULL,
        "portal" VARCHAR(255),
        "pais" VARCHAR(255),
        "cliente" VARCHAR(255),
        "fechaCreacion" DATE,
        "fechaExpira" DATE,
        "montoAproximado" NUMERIC(15, 2),
        "currencySymbol" VARCHAR(5),
        "estatus" VARCHAR(255),
        "comercial" VARCHAR(255),
        "productos" TEXT,
        "descripcion" TEXT
      );
    `);

    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    if (usersCount.rows[0].count === '0') {
      console.log("Insertando usuarios iniciales...");
      for (const user of initialUsers) {
        await client.query(
          'INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, $3)',
          [user.username.toLowerCase(), user.password, user.isAdmin]
        );
      }
    }

    const opportunitiesCount = await client.query('SELECT COUNT(*) FROM opportunities');
    if (opportunitiesCount.rows[0].count === '0') {
      console.log("Insertando oportunidades iniciales...");
      for (const op of initialOpportunitiesData) {
        await client.query(
          `INSERT INTO opportunities ("idOportunidad", "portal", "pais", "cliente", "fechaCreacion", "fechaExpira", "montoAproximado", "estatus", "comercial", "productos", "descripcion", "currencySymbol") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            op.idOportunidad,
            op.portal,
            op.pais,
            op.cliente,
            op.fechaCreacion || null,
            op.fechaExpira || null,
            parseFloat(op.montoAproximado) || 0,
            op.estatus.trim(),
            op.comercial,
            op.productos,
            op.descripcion,
            '$'
          ]
        );
      }
    }

    console.log("Inicialización de BD completa.");
  } catch (err) {
    console.error('Error durante la inicialización de la BD:', err.stack);
  } finally {
    client.release();
  }
}

// Endpoint de login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username.toLowerCase(), password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint para obtener oportunidades
app.get('/api/opportunities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, 
        TO_CHAR("fechaCreacion", 'YYYY-MM-DD') AS "fechaCreacion", 
        TO_CHAR("fechaExpira", 'YYYY-MM-DD') AS "fechaExpira" 
      FROM opportunities 
      ORDER BY "fechaCreacion" DESC
    `);
    res.json({ opportunities: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inicializar BD y arrancar servidor
initializeDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
});
