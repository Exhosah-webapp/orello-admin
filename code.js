"use strict";
const SESSION_KEY = "orello-sessions-v1";
const PROJECT_KEY = "orello-projects-v1";
const IMPORTED_KEY = "orello-imported-v1";
figma.showUI(__html__, {
    width: 360,
    height: 700
});
figma.ui.onmessage = async (msg) => {
    if (msg.type === "get-sessions") {
        const sessions = (await figma.clientStorage.getAsync(SESSION_KEY));
        figma.ui.postMessage({
            type: "sessions-loaded",
            sessions: sessions ?? []
        });
        return;
    }
    if (msg.type === "save-session") {
        if (!msg.projectName ||
            typeof msg.durationSeconds !== "number" ||
            !Number.isFinite(msg.durationSeconds) ||
            msg.durationSeconds < 0) {
            figma.ui.postMessage({
                type: "save-error",
                message: "The session details were invalid."
            });
            return;
        }
        const existing = (await figma.clientStorage.getAsync(SESSION_KEY));
        const session = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            projectId: msg.projectId,
            projectName: msg.projectName,
            durationSeconds: Math.floor(msg.durationSeconds),
            completedAt: msg.completedAt || new Date().toISOString()
        };
        const updated = [session, ...(existing ?? [])];
        await figma.clientStorage.setAsync(SESSION_KEY, updated);
        figma.ui.postMessage({
            type: "sessions-updated",
            sessions: updated
        });
        return;
    }
    if (msg.type === "get-projects") {
        const projects = (await figma.clientStorage.getAsync(PROJECT_KEY));
        figma.ui.postMessage({
            type: "projects-loaded",
            projects: projects ?? []
        });
        return;
    }
    if (msg.type === "create-project") {
        const name = msg.name?.trim();
        if (!name) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Enter a project name."
            });
            return;
        }
        const existing = (await figma.clientStorage.getAsync(PROJECT_KEY));
        const projects = existing ?? [];
        if (projects.some(project => project.name.toLowerCase() === name.toLowerCase())) {
            figma.ui.postMessage({
                type: "project-error",
                message: "A project with this name already exists."
            });
            return;
        }
        const project = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            description: msg.description?.trim() ?? "",
            startDate: msg.startDate ?? "",
            targetDate: msg.targetDate ?? "",
            createdAt: new Date().toISOString(),
            status: "Planning"
        };
        const updated = [project, ...projects];
        await figma.clientStorage.setAsync(PROJECT_KEY, updated);
        figma.ui.postMessage({
            type: "projects-updated",
            projects: updated
        });
        return;
    }
    if (msg.type === "update-project") {
        const existing = (await figma.clientStorage.getAsync(PROJECT_KEY));
        const projects = existing ?? [];
        const index = projects.findIndex(project => project.id === msg.projectId);
        if (index === -1) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Project not found."
            });
            return;
        }
        const name = msg.name?.trim();
        if (!name) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Project name cannot be empty."
            });
            return;
        }
        if (projects.some(project => project.id !== msg.projectId &&
            project.name.toLowerCase() === name.toLowerCase())) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Another project already uses this name."
            });
            return;
        }
        if (msg.status &&
            !["Planning", "In progress", "Completed"].includes(msg.status)) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Choose a valid project status."
            });
            return;
        }
        if (msg.startDate &&
            msg.targetDate &&
            msg.targetDate < msg.startDate) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Target date cannot be before the start date."
            });
            return;
        }
        projects[index] = {
            ...projects[index],
            name,
            description: msg.description?.trim() ?? "",
            startDate: msg.startDate ?? "",
            targetDate: msg.targetDate ?? "",
            status: msg.status ?? projects[index].status ?? "Planning"
        };
        await figma.clientStorage.setAsync(PROJECT_KEY, projects);
        figma.ui.postMessage({
            type: "projects-updated",
            projects
        });
        return;
    }
    if (msg.type === "delete-project") {
        const existing = (await figma.clientStorage.getAsync(PROJECT_KEY));
        const projects = existing ?? [];
        const remaining = projects.filter(project => project.id !== msg.projectId);
        if (remaining.length === projects.length) {
            figma.ui.postMessage({
                type: "project-error",
                message: "Project not found."
            });
            return;
        }
        await figma.clientStorage.setAsync(PROJECT_KEY, remaining);
        figma.ui.postMessage({
            type: "projects-updated",
            projects: remaining
        });
        return;
    }
    if (msg.type === "get-local-data") {
        const projects = (await figma.clientStorage.getAsync(PROJECT_KEY));
        const sessions = (await figma.clientStorage.getAsync(SESSION_KEY));
        const imported = Boolean(await figma.clientStorage.getAsync(IMPORTED_KEY + ":" + msg.userId));
        figma.ui.postMessage({
            type: "local-data",
            projects: projects ?? [],
            sessions: sessions ?? [],
            imported
        });
        return;
    }
    if (msg.type === "mark-imported") {
        await figma.clientStorage.setAsync(IMPORTED_KEY + ":" + msg.userId, true);
        return;
    }
    if (msg.type === "cancel") {
        figma.closePlugin();
    }
};
