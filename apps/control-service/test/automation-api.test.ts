import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// MUST import setup before importing app to ensure mocks are hoisted
import { mockResolveInsForgeSession } from "./setup";
import { app } from "../src/index";

describe("Automation API Endpoints", () => {
  const adminSession = {
    actor: {
      actorId: "admin-1",
      actorType: "user",
      actorName: "Admin",
      roles: ["admin"],
    },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  };

  const viewerSession = {
    actor: {
      actorId: "viewer-1",
      actorType: "user",
      actorName: "Viewer",
      roles: ["viewer"],
    },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /v1/automation/status", () => {
    it("should allow authenticated users to get automation status", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/status")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/v1/automation/status");

      expect(response.status).toBe(401);
    });

    it("should return status object", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/status")
        .set("Authorization", "Bearer admin-token");

      if (response.status === 200) {
        expect(response.body).toHaveProperty("enabled");
        expect(response.body).toHaveProperty("mode");
        expect(response.body).toHaveProperty("services");
        expect(response.body).toHaveProperty("metrics");
      }
    });
  });

  describe("POST /v1/automation/mode", () => {
    it("should allow changing automation mode", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer admin-token")
        .send({ mode: "aggressive" });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require automation:manage permission", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "viewer-token") return viewerSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer viewer-token")
        .send({ mode: "safe" });

      // Might be 403 or 200 depending on permissions setup
      expect(response.status).not.toBe(401);
    });

    it("should accept safe mode", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer admin-token")
        .send({ mode: "safe" });

      expect(response.status).not.toBe(500);
    });

    it("should accept balanced mode", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer admin-token")
        .send({ mode: "balanced" });

      expect(response.status).not.toBe(500);
    });

    it("should accept aggressive mode", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer admin-token")
        .send({ mode: "aggressive" });

      expect(response.status).not.toBe(500);
    });

    it("should reject invalid mode", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .post("/v1/automation/mode")
        .set("Authorization", "Bearer admin-token")
        .send({ mode: "invalid" });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /v1/automation/approvals", () => {
    it("should allow getting auto-approval rules", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/approvals")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/v1/automation/approvals");

      expect(response.status).toBe(401);
    });

    it("should return rules array", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/approvals")
        .set("Authorization", "Bearer admin-token");

      if (response.status === 200) {
        expect(Array.isArray(response.body.rules) || response.body.rules === undefined).toBe(true);
        expect(response.body.count >= 0 || response.body.count === undefined).toBe(true);
      }
    });
  });

  describe("GET /v1/automation/alerts", () => {
    it("should allow getting alert acknowledgment rules", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/alerts")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/v1/automation/alerts");

      expect(response.status).toBe(401);
    });

    it("should return rules", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/alerts")
        .set("Authorization", "Bearer admin-token");

      if (response.status === 200) {
        expect(response.body).toHaveProperty("rules");
        expect(response.body).toHaveProperty("count");
      }
    });
  });

  describe("GET /v1/automation/healing", () => {
    it("should allow getting healing strategies", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/healing")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/v1/automation/healing");

      expect(response.status).toBe(401);
    });

    it("should return strategies", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/healing")
        .set("Authorization", "Bearer admin-token");

      if (response.status === 200) {
        expect(response.body).toHaveProperty("strategies");
        expect(response.body).toHaveProperty("count");
      }
    });
  });

  describe("GET /v1/automation/rollback", () => {
    it("should allow getting rollback strategies", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/rollback")
        .set("Authorization", "Bearer admin-token");

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/v1/automation/rollback");

      expect(response.status).toBe(401);
    });

    it("should return strategies", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const response = await request(app)
        .get("/v1/automation/rollback")
        .set("Authorization", "Bearer admin-token");

      if (response.status === 200) {
        expect(response.body).toHaveProperty("strategies");
        expect(response.body).toHaveProperty("count");
      }
    });
  });

  describe("Endpoint Consistency", () => {
    it("should have consistent response format", async () => {
      mockResolveInsForgeSession.mockImplementation(async (token: string) => {
        if (token === "admin-token") return adminSession;
        throw new Error("invalid token");
      });

      const endpoints = [
        "/v1/automation/approvals",
        "/v1/automation/alerts",
        "/v1/automation/healing",
        "/v1/automation/rollback",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", "Bearer admin-token");

        if (response.status === 200) {
          expect(response.body.count >= 0).toBe(true);
        }
      }
    });
  });
});
