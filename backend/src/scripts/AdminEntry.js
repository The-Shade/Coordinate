require('dotenv').config({path: "../.env"});

const bcrypt = require("bcryptjs");
const {clientConnect, client} = require("../db.js");


async function enterAdmin() {
    const {ADMIN_NAME, ADMIN_PASSWORD, ADMIN_EMAIL} = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
        throw new Error("Missing required admin environment variables");
    }

    if (ADMIN_PASSWORD.length < 32) {
        throw new Error("Admin password must be at least 32 characters long");
    }

    const db = await clientConnect();
    const users = await db.collection(process.env.USERS_TABLE);
    const email = ADMIN_EMAIL.trim().toLowerCase();

    const existing = await users.findOne({ email });

    if (existing) {
        console.log("User already exists");
        return;
    }

    const password = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await users.insertOne({
        name: ADMIN_NAME.trim(),
        email: email,
        password: password,
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log("Initial admin created");
}

enterAdmin()
.catch((err) => {
    console.error(err);
    process.exit(1);
})
.finally(async () => {
    await client.close();
});