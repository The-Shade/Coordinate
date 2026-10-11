const {MongoClient} = require('mongodb');
const client = new MongoClient(process.env.MONGO_URL);

async function clientConnect() {
    await client.connect();

    console.log("MongoDB Connected!");

    return client.db(process.env.DB_NAME);
}

module.exports = {clientConnect, client};