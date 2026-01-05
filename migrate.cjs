const fs = require('fs');
const { Client } = require('pg');

const connectionString = "postgres://postgres.fnbllxdtrfueodrqvpjl:Pe1GLFZdewmYYFn5@aws-1-us-west-1.pooler.supabase.com:6543/postgres?supa=base-pooler.x";

async function migrate() {
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        const sql = fs.readFileSync('./schema.sql', 'utf8');
        await client.query(sql);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await client.end();
    }
}

migrate();
