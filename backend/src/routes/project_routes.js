const express = require('express');
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth.js');

const router = express.Router();
router.use(authenticateToken);

function validId (id) {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

function projectAccess (project, user) {
    return (user.role === "admin" && project.createdBy.toString() === user.id);
}

function parseDate (value, field, required = false) {
    if (value === null && !required) return { value: null };

    if (typeof value !== "string" || !value.trim()) {
        return { error: `${field} must be a valid date string` };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return { error: `${field} must be a valid date` };
    }

    return { value: date };
}

// create
router.post("/", async (req, res) => {
    try {
        const { name, description = "", startDate, dueDate } = req.body;

        if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
            return res.status(400).json({message: `Project name is required (Max 150 characters)`});
        }

        if (typeof description !== "string" || description.length > 2000) {
            res.status(400).json({message: `Description must be a string of at most 2000 characters`});
        }

        const start = startDate === undefined ? { value: new Date() }: parseDate(startDate, "startDate", true);
        const due = dueDate === undefined ? { value: null } : parseDate(dueDate, "dueDate");

        if (start.error || due.error) {
            return res.status(400).json({message: start.error || due.error});
        }

        if (due.value && due.value < start.value) {
            return res.status(400).json({message: "Due date cannot be before start date"});
        }

        const db = req.app.locals.db;

        const project = {
            name: name.trim(),
            description: description.trim(),
            startDate: start.value,
            dueDate: due.value,
            createdBy: new ObjectId(req.user.id),
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const result = await db.collection(process.env.PROJECTS_TABLE).insertOne(project);

        return res.status(201).json({
            message: "Project created successfully",
            project: {
                ...project,
                _id: result.insertId
            }
        });
    } catch (error) {
        console.error("Create project failed", error.message);
        return res.status(500).json({message: error.message});
    }
});

// list all
router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;
        const filter = req.user.role === "admin"? {}: {createdBy: new ObjectId(req.user.id)};
        const projects = await db.collection(process.env.PROJECTS_TABLE).find(filter).sort({ createdAt: -1 }).limit(100).toArray();

        return res.json({ projects });
    } catch (error) {
        console.error("List projects failed: ", error.message);
        return res.status(500).json({message: error.message});
    }
});

// get one
router.get("/:id", async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({message: "Invalid project id"});
        }

        const db = req.app.locals.db;
        const project = await db.collection(process.env.PROJECTS_TABLE).findOne({ _id: new ObjectId(req.params.id) });

        if (!project || !projectAccess(project, req.user)) {
            return res.status(404).json({message: "Project not found"});
        }

        return res.json({ project });
    } catch (error) {
        console.error("Get project failed: ", error.message);
        return res.status(500).json({message: error.message});
    }
});

// update
router.patch("/:id", async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({message: "Invalid project id"});
        }

        const db = req.app.locals.db;
        const projectId = new ObjectId(req.params.id);
        const existing_project = await db.collection(process.env.PROJECTS_TABLE).findOne({ _id: projectId });

        if (!existing_project || !projectAccess(existing_project, req.user)) {
            return res.status(404).json({message: "Project not found"});
        }

        const allowed_fields = ["name", "description", "startDate", "dueDate"];
        const given_fields = Object.keys(req.body);

        if (given_fields.length === 0 || given_fields.some(field => !allowed_fields.includes(field))) {
            return res.status(400).json({message: "Provide valid project fields for update"});
        }

        const updates = {};

        if (req.body.name !== undefined) {
            if (typeof req.body.name !== "string" || !req.body.name.trim() || req.body.name.trim().length > 150) {
                return res.status(400).json({message: "Invalid project name"});
            }

            updates.name = req.body.name.trim();
        }

        if (req.body.description !== undefined) {
            if (typeof req.body.description !== "string" || req.body.description.trim().length > 2000) {
                return res.status(400).json({message: "Invalid project description"});
            }

            updates.description = req.body.description.trim();
        }

        if (req.body.startDate !== undefined) {
            const result = parseDate(req.body.startDate, "startDate", true);
            if (result.error) {
                return res.status(400).json({message: result.error});
            }

            updates.startDate = result.value;
        }

        if (req.body.dueDate !== undefined) {
            const result = parseDate(req.body.dueDate, "dueDate");
            if (result.error) {
                return res.status(400).json({message: result.error});
            }

            updates.dueDate = result.value;
        }

        const updatedStartDate = updates.startDate ?? existing_project.startDate;
        const updatedDueDate = updates.dueDate ?? existing_project.dueDate;

        if (updatedDueDate && updatedDueDate < updatedStartDate) {
            return res.status(400).json({message: "Due date cannot be before start date"});
        }

        updates.updatedAt = new Date();

        await db.collection(process.env.PROJECTS_TABLE).updateOne({_id: projectId}, { $set: updates });
        const updated_result = await db.collection(process.env.PROJECTS_TABLE).findOne({ _id: projectId });

        return res.json({
            message: "Project updated successfully",
            project: updated_result
        });
    } catch (error) {
        console.error("Patch project failed: ", error.message);
        return res.status(500).json({message: error.message});
    }
});

// delete - admin only
router.delete("/:id", async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({message: "Admin access required"});
        }

        if (!validId(req.params.id)) {
            return res.status(400).json({message: "Invalid project id"});
        }

        const db = req.app.locals.db;
        const projectId = new ObjectId(req.params.id);
        const project = await db.collection(process.env.PROJECTS_TABLE).findOne({ _id: projectId });

        if (!project) {
            return res.status(404).json({message: "Project not found"});
        }

        const containsTasks = await db.collection(process.env.TASKS_TABLE).findOne({ projectId });

        if (containsTasks) {
            return res.status(409).json({message: "Delete or reassign project tasks first"});
        }

        await db.collection(process.env.PROJECTS_TABLE).deleteOne({ _id: projectId });
        return res.json({message: "Project deleted successfully"});
    } catch (error) {
        console.error("Delete project failed: ", error.message);
        return res.status(500).json({message: error.message});
    }
});

module.exports = router;