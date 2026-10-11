const users = process.env.USERS_TABLE;

const express = require('express');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login/", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(401).json({message: "Email and password is required"});
        }

        const db = req.app.locals.db;

        const user = await db.collection(users).findOne({ email: email.trim().toLowerCase() });

        if (!user || !user.isActive || !user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        const token = jwt.sign({
            userid: user._id.toString()
        }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h"
        });

        return res.json({
            message: "Authentication successful",
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login failed: ", error.message);

        return res.status(500).json({message: error.message});
    }
});

module.exports = router;