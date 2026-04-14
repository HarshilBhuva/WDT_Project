import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'data.json');
const backupsDir = path.join(__dirname, '.data-backups');

const MAX_BODY_BYTES = 512_000;

function ensureDataFile() {
    if (!fs.existsSync(dataPath)) {
        const initial = {
            transactions: [
                { id: crypto.randomUUID(), desc: 'Freelance Project', category: 'Income', date: '2023-10-25', amount: 2500.00 },
                { id: crypto.randomUUID(), desc: 'Whole Foods Market', category: 'Food', date: '2023-10-24', amount: -145.20 },
                { id: crypto.randomUUID(), desc: 'Netflix Subscription', category: 'Fun', date: '2023-10-23', amount: -15.99 },
                { id: crypto.randomUUID(), desc: 'City Utilities', category: 'Utilities', date: '2023-10-22', amount: -120.50 }
            ],
            goals: [],
            completedGoals: []
        };
        fs.writeFileSync(dataPath, JSON.stringify(initial, null, 2));
    }
}

function atomicWrite(filePath, content) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, filePath);
}

function rotateDailyBackup() {
    if (!fs.existsSync(dataPath)) return;
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);
    const today = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupsDir, `data-${today}.json`);
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(dataPath, backupPath);
    }
}

const dataApiPlugin = () => ({
    name: 'data-api-plugin',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (!req.url || req.url.split('?')[0] !== '/api/data') {
                next();
                return;
            }

            if (req.method === 'GET') {
                try {
                    ensureDataFile();
                    const data = fs.readFileSync(dataPath, 'utf-8');
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    res.statusCode = 200;
                    res.end(data);
                } catch (err) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to read data file' }));
                }
                return;
            }

            if (req.method === 'POST') {
                let body = '';
                let tooLarge = false;

                req.on('data', chunk => {
                    body += chunk.toString();
                    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                        tooLarge = true;
                        res.statusCode = 413;
                        res.end(JSON.stringify({ error: 'Payload too large' }));
                        req.destroy();
                    }
                });

                req.on('end', () => {
                    if (tooLarge) return;
                    try {
                        const newData = JSON.parse(body);
                        ensureDataFile();
                        rotateDailyBackup();

                        let existingData = {};
                        try {
                            existingData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                        } catch (_) {}

                        const mergedData = { ...existingData, ...newData };
                        atomicWrite(dataPath, JSON.stringify(mergedData, null, 2));

                        res.setHeader('Content-Type', 'application/json');
                        res.statusCode = 200;
                        res.end(JSON.stringify({ status: 'success' }));
                    } catch (e) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Invalid JSON or write error' }));
                    }
                });
                return;
            }

            if (req.method === 'OPTIONS') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                res.statusCode = 204;
                res.end();
                return;
            }

            next();
        });
    }
});

export default defineConfig({
    plugins: [dataApiPlugin()]
});
