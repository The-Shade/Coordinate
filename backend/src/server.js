require('dotenv').config();
const express = require('express');
const {clientConnect, client} = require('./db.js');
const initDb = require('./db_indexes.js');
const auth_routes = require('./routes/auth_routes.js');
const { authenticateToken } = require('./middleware/auth.js');
const app = express();
app.use(express.json());


app.get('/hello/', (req, res) => {
    res.send('Hello World!');
});

app.use("/auth/", auth_routes);

app.get("/admin/hello/", authenticateToken, (req, res) => {
    res.json({user: req.user});
});


async function serverStart() {
    try {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            throw new Error('Invalid JWT_SECRET');
        }

        const db = await clientConnect();
        app.locals.db = db;
        await initDb(db);

        app.listen(process.env.PORT, () => {
            console.log(`Server started on port ${process.env.PORT}`);
        });
    } catch (err) {
        console.error(err);
        client.close().catch(() => {});
        process.exit(1);
    }
}

serverStart();
