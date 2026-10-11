require('dotenv').config();
const express = require('express');
const {clientConnect, client} = require('./db.js');
const initDb = require('./db_indexes.js');
const app = express();
app.use(express.json());


app.get('/hello/', (req, res) => {
    res.send('Hello World!');
});


async function serverStart() {
    try {
        const db = await clientConnect();
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
