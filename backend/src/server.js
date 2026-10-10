require('dotenv').config();
const express = require('express');
const {clientConnect, client} = require('./db.js');
const app = express();
app.use(express.json());


app.get('/hello/', (req, res) => {
    res.send('Hello World!');
});


try {
    clientConnect();
} catch (error) {
    console.error(error);
    process.exit(1);
}

app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT}`);
})
