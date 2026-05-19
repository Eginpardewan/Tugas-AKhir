const mysql = require('mysql2/promise');

async function testQuery() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Ars1pneg@r@',
        database: 'tajwid_learning'
    });

    const lowerAddress = '0x5525598b4e3b70530c3aca29f1565dd5bd5344f5';
    const [results] = await db.query('SELECT * FROM admins WHERE LOWER(wallet_address) = ?', [lowerAddress]);
    console.log("Query Results:", results);
    db.end();
}

testQuery();
