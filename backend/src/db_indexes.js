async function initDb(db) {
    // unique emails
    await db.collection(process.env.USERS_TABLE).createIndex({email: 1}, {unique: true});

    // listing a user's projects
    await db.collection(process.env.PROJECTS_TABLE).createIndex({createdBy: 1, createdAt: -1});

    // task filtering by project and status
    await db.collection(process.env.TASKS_TABLE).createIndex({projectId: 1, status: 1});

    // task filtering by assigned to and status
    await db.collection(process.env.TASKS_TABLE).createIndex({assignedTo: 1, status: 1});

    console.log("Database indexes initialized");
}

module.exports = initDb;