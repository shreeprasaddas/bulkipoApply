import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'ipo_accounts.db');
let db;

export function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                db.run(`
                    CREATE TABLE IF NOT EXISTS accounts (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        dp TEXT NOT NULL,
                        username TEXT NOT NULL,
                        password TEXT NOT NULL,
                        crn_number TEXT NOT NULL,
                        pin_1 TEXT,
                        pin_2 TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    });
}

export function addAccount(data) {
    return new Promise((resolve, reject) => {
        const id = uuidv4();
        db.run(
            `INSERT INTO accounts (id, name, dp, username, password, crn_number, pin_1, pin_2) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.name, data.dp, data.username, data.password, data.crn_number, data.pin_1, data.pin_2],
            function(err) {
                if (err) reject(err);
                else resolve(id);
            }
        );
    });
}

export function getAccounts() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM accounts ORDER BY created_at DESC`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

export function getAccount(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM accounts WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function updateAccount(id, data) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE accounts SET name = ?, dp = ?, username = ?, password = ?, crn_number = ?, pin_1 = ?, pin_2 = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [data.name, data.dp, data.username, data.password, data.crn_number, data.pin_1, data.pin_2, id],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

export function deleteAccount(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM accounts WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}
