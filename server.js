const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE CONEXIÓN DIRECTA PARA RENDER ---
// Este bloque asume que SIEMPRE se ejecutará en un entorno que proporciona la DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esta configuración es REQUERIDA por Render
  }
});

// Añadimos un log para depurar y ver si la variable de entorno se está leyendo
console.log(`Intentando conectar a la base de datos. ¿URL de BD encontrada?: ${process.env.DATABASE_URL ? 'Sí' : 'No, no se encontró la variable DATABASE_URL'}`);


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
    { idOportunidad: '72073', portal: 'Dynatrace', pais: 'GT', cliente: 'EEGSA', fechaCreacion: '2024-04-25', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72058', portal: 'Dynatrace', pais: 'GT', cliente: 'Aceros de Guatemala', fechaCreacion: '2024-04-25', fechaExpira: '2025-06-07', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72181', portal: 'Dynatrace', pais: 'GT', cliente: 'Fundap', fechaCreacion: '2024-05-06', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72182', portal: 'Dynatrace', pais: 'GT', cliente: 'Banco de Guatemala', fechaCreacion: '2024-05-06', fechaExpira: '2025-05-06', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72223', portal: 'Dynatrace', pais: 'GT', cliente: 'Grupo Terra', fechaCreacion: '2024-05-07', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '72648', portal: 'Dynatrace', pais: 'GT', cliente: 'IGSS', fechaCreacion: '2024-05-17', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Luis Roldan', productos: '', descripcion: '' },
    { idOportunidad: '72993', portal: 'Dynatrace', pais: 'GT', cliente: 'Organismo Judicial Monitoreo', fechaCreacion: '2024-05-29', fechaExpira: '2025-06-01', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '73182', portal: 'Dynatrace', pais: 'HN', cliente: 'Banco Cuscatlan de Honduras, S.A.', fechaCreacion: '2024-06-04', fechaExpira: '2025-06-01', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '73684', portal: 'Dynatrace', pais: 'GT', cliente: 'BANRURAL', fechaCreacion: '2024-06-12', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '73683', portal: 'Dynatrace', pais: 'SV', cliente: 'Administradora de Fondos de Pensiones Confia S.A', fechaCreacion: '2024-06-12', fechaExpira: '2025-05-05', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '73682', portal: 'Dynatrace', pais: 'GT', cliente: 'BANCO DE GUATEMALA', fechaCreacion: '2024-06-12', fechaExpira: '2025-05-05', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '74187', portal: 'Dynatrace', pais: 'GT', cliente: 'CBC - Pepsi', fechaCreacion: '2024-06-12', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '74368', portal: 'Dynatrace', pais: 'GT', cliente: 'BANTRAB', fechaCreacion: '2024-06-27', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '74799', portal: 'Dynatrace', pais: 'GT', cliente: 'Banco Industrial SA', fechaCreacion: '2024-07-10', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '75399', portal: 'Dynatrace', pais: 'GT', cliente: 'Ministerio Publico', fechaCreacion: '2024-07-29', fechaExpira: '2025-06-01', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '75678', portal: 'Dynatrace', pais: 'CR', cliente: 'COOPEMEP', fechaCreacion: '2024-08-06', fechaExpira: null, montoAproximado: 0, estatus: 'Rechazada', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '76081', portal: 'Dynatrace', pais: 'GT', cliente: 'Banco Azteca', fechaCreacion: '2024-08-19', fechaExpira: '2025-05-20', montoAproximado: 67420.62, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '77340', portal: 'Dynatrace', pais: 'GT', cliente: 'Cerveceria Centroamericana', fechaCreacion: '2024-09-19', fechaExpira: '2025-10-24', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '77410', portal: 'Dynatrace', pais: 'GT', cliente: 'Federación de Cooperativas de ahorro y crédito', fechaCreacion: '2024-09-25', fechaExpira: '2025-06-23', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '78180', portal: 'Dynatrace', pais: 'HN', cliente: 'Banco de Occidente, S.A.', fechaCreacion: '2024-10-21', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '78264', portal: 'Dynatrace', pais: 'HN', cliente: 'Cementos del Norte, S.A', fechaCreacion: '2024-10-23', fechaExpira: '2025-09-08', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '78262', portal: 'Dynatrace', pais: 'HN', cliente: 'Cooperativa de Ahorro y Crédito ELGA', fechaCreacion: '2024-10-23', fechaExpira: '2025-09-08', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '78808', portal: 'Dynatrace', pais: 'HN', cliente: 'ELCATEX', fechaCreacion: '2024-11-07', fechaExpira: '2025-09-02', montoAproximado: 31000, estatus: 'Aprobado', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '79739', portal: 'Dynatrace', pais: 'GT', cliente: 'Soporte De Servicios Administrativos, Sociedad Anonima', fechaCreacion: '2024-12-03', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '79728', portal: 'Dynatrace', pais: 'GT', cliente: 'Banco Azteca de Guatemala, S.A', fechaCreacion: '2024-12-03', fechaExpira: '2025-04-23', montoAproximado: 17310.54, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '79732', portal: 'Dynatrace', pais: 'GT', cliente: 'Ministerio de Finanzas', fechaCreacion: '2024-12-03', fechaExpira: '2025-07-09', montoAproximado: 0, estatus: 'Aprobado', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '81820', portal: 'Dynatrace', pais: 'GT', cliente: 'Contraloria General de Cuenta', fechaCreacion: '2025-01-29', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '81819', portal: 'Dynatrace', pais: 'GT', cliente: 'Cementos progreso', fechaCreacion: '2025-02-07', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Guillermo Dominguez', productos: '', descripcion: '' },
    { idOportunidad: '81929', portal: 'Dynatrace', pais: 'HN', cliente: 'Cooperativa Chorotega', fechaCreacion: '2025-02-12', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Eduardo Enrique Gonzales', productos: '', descripcion: '' },
    { idOportunidad: '82002', portal: 'Dynatrace', pais: 'HN', cliente: 'Supermercados La Colonia de Honduras SA de CV', fechaCreacion: '2025-02-18', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '82579', portal: 'Dynatrace', pais: 'CR', cliente: 'Banco Popular y de desarrollo Comunal', fechaCreacion: '2025-07-03', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '83260', portal: 'Dynatrace', pais: 'HN', cliente: 'Banco Hondureno del Cafe SA de CV', fechaCreacion: '2025-03-25', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01555', portal: 'NetBrain', pais: 'SV', cliente: 'AFP Confia', fechaCreacion: '2025-03-19', fechaExpira: '2025-10-03', montoAproximado: 0, estatus: 'Activo', comercial: 'Oscar García', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-015400', portal: 'NetBrain', pais: 'CR', cliente: 'Banco Popular y de desarrollo Comunal', fechaCreacion: '2025-11-03', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01519', portal: 'NetBrain', pais: 'HN', cliente: 'Supermercados La Colonia', fechaCreacion: '2025-02-18', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01475', portal: 'NetBrain', pais: 'SV', cliente: 'Banco Atlantida', fechaCreacion: '2025-01-22', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Oscar García', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01587', portal: 'NetBrain', pais: 'CR', cliente: 'COOPEMEP RL', fechaCreacion: '2025-04-07', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01570', portal: 'NetBrain', pais: 'SV', cliente: 'BAC EL SALVADOR', fechaCreacion: '2025-03-27', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Oscar García', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01573', portal: 'NetBrain', pais: 'GT', cliente: 'SAT Guatemala', fechaCreacion: '2025-03-31', fechaExpira: '2025-10-10', montoAproximado: 0, estatus: 'Activo', comercial: 'Jorge Sandoval', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01588', portal: 'NetBrain', pais: 'CR', cliente: 'COOPEMEP RL', fechaCreacion: '2025-04-07', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: 'DealReg-01595', portal: 'NetBrain', pais: 'CR', cliente: 'SINIRUBE', fechaCreacion: '2025-04-11', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Cesar Jimenez', productos: '', descripcion: '' },
    { idOportunidad: '83262', portal: 'Dynatrace', pais: 'GT', cliente: 'ORGANISMO JUDICIAL', fechaCreacion: '2025-03-25', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Francisco Sandoval', productos: '', descripcion: '' },
    { idOportunidad: '83594', portal: 'Dynatrace', pais: 'GT', cliente: 'Ingenio magdalena', fechaCreacion: '2025-04-04', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Jorge Sandoval', productos: '', descripcion: '' },
    { idOportunidad: '83665', portal: 'Dynatrace', pais: 'HN', cliente: 'Banrural Honduras', fechaCreacion: '2025-04-08', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Mitchell Castillo Ramirez', productos: '', descripcion: '' },
    { idOportunidad: '84620', portal: 'Dynatrace', pais: 'GT', cliente: 'Instituto Nacional de Electrificación -INDE', fechaCreacion: '2025-05-14', fechaExpira: null, montoAproximado: 0, estatus: 'pendiente', comercial: 'Francisco Sandoval', productos: '', descripcion: '' },
    { idOportunidad: '84747', portal: 'Dynatrace', pais: 'GT', cliente: 'BAM', fechaCreacion: '2025-05-19', fechaExpira: '2026-02-14', montoAproximado: 0, estatus: 'Activo', comercial: 'Francisco Sandoval', productos: '', descripcion: '' },
    { idOportunidad: '84840', portal: 'Dynatrace', pais: 'GT', cliente: 'Ingenio Magdalena', fechaCreacion: '2025-05-21', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Alejandra Gonzalez', productos: '', descripcion: '' },
    { idOportunidad: '1647', portal: 'NetBrain', pais: 'GT', cliente: 'Instituto Nacional de Electrificación -INDE', fechaCreacion: '2025-05-14', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Francisco Sandoval', productos: '', descripcion: '' },
    { idOportunidad: 'DR20250528-351283', portal: 'SOPHOS', pais: 'HN', cliente: 'Escuela Agricola Panamericana El Zamorano', fechaCreacion: '2025-05-28', fechaExpira: null, montoAproximado: 0, estatus: 'Pendiente', comercial: 'Estuardo Ramirez', productos: '', descripcion: '' }
];

async function initializeDbAndLoadInitialData() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                isAdmin INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS opportunities (
                internalId SERIAL PRIMARY KEY,
                idOportunidad VARCHAR(255) UNIQUE NOT NULL,
                portal VARCHAR(255) NOT NULL,
                pais VARCHAR(255) NOT NULL,
                cliente VARCHAR(255) NOT NULL,
                fechaCreacion DATE,
                fechaExpira DATE,
                montoAproximado NUMERIC(15, 2) NOT NULL,
                currencySymbol VARCHAR(5) DEFAULT '$',
                estatus VARCHAR(255) NOT NULL,
                comercial VARCHAR(255) NOT NULL,
                productos TEXT,
                descripcion TEXT
            );
        `);

        const users = await client.query('SELECT COUNT(*) FROM users');
        if (users.rows[0].count === '0') {
            console.log("Insertando usuarios iniciales...");
            const initialUsers = [
                { username: 'paola.rangel@bogu-tech.com', password: 'Pao1234', isAdmin: 1 },
                { username: 'mitchell@bogu-tech.com', password: 'Mit123--', isAdmin: 2 },
                { username: 'oscar@bogu-tech.com', password: 'Oscar1234', isAdmin: 1 }
            ];
            for (const user of initialUsers) {
                await client.query('INSERT INTO users (username, password, isAdmin) VALUES ($1, $2, $3)', [user.username.toLowerCase(), user.password, user.isAdmin]);
            }
        }
        
        const opportunities = await client.query('SELECT COUNT(*) FROM opportunities');
        if (opportunities.rows[0].count === '0') {
            console.log("Insertando datos de ejemplo para opportunities...");
            for(const op of initialOpportunitiesData) {
                const parseDate = (dateStr) => {
                    if (!dateStr || !dateStr.trim()) return null;
                    if (dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                    return dateStr;
                };
                
                await client.query(
                    `INSERT INTO opportunities (idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, estatus, comercial, productos, descripcion, currencySymbol) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        op.idOportunidad, op.portal, op.pais, op.cliente, 
                        parseDate(op.fechaCreacion), parseDate(op.fechaExpira), 
                        parseFloat(op.montoAproximado) || 0, op.estatus.trim(), op.comercial, 
                        op.productos, op.descripcion, '$'
                    ]
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

// --- API Endpoints ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT username, "isAdmin" FROM users WHERE username = $1 AND password = $2', [username.toLowerCase(), password]);
        if (result.rows.length > 0) {
            const user = { username: result.rows[0].username, isAdmin: result.rows[0].isAdmin };
            res.json({ message: 'Login exitoso', user });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/opportunities', async (req, res) => {
    try {
        const result = await pool.query('SELECT *, to_char(fechaCreacion, \'YYYY-MM-DD\') as "fechaCreacion", to_char(fechaExpira, \'YYYY-MM-DD\') as "fechaExpira" FROM opportunities');
        res.json({ opportunities: result.rows });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/opportunities', async (req, res) => {
    const { idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO opportunities (idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING "internalId"`,
            [idOportunidad, portal, pais, cliente, fechaCreacion, fechaExpira || null, montoAproximado, currencySymbol, estatus, comercial, productos, descripcion]
        );
        res.status(201).json({ message: 'Oportunidad creada', internalId: result.rows[0].internalId });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ message: `Ya existe una oportunidad con el ID: ${idOportunidad}` });
        }
        res.status(500).json({ message: err.message });
    }
});

// El resto de los endpoints (createUser, createAdminUser, etc.) deben ser adaptados
// de la misma forma para usar `pool.query` si se quieren utilizar.

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));