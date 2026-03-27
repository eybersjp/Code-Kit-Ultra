import axios, { AxiosInstance } from "axios";
import * as vscode from "vscode";
import { SessionManager } from "../auth/sessionClient.js";

/**
 * Wave 6: Unified API Client for VS Code Extension.
 * Enforces bearer token from session manager or fallback to legacy API key.
 */
class ApiClient {
  private static instance: AxiosInstance;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create();
      
      ApiClient.instance.interceptors.request.use((config) => {
        const vscodeConfig = vscode.workspace.getConfiguration("codeKitUltra");
        const authMode = vscodeConfig.get<string>("authMode") || "bearer-session";
        const legacyApiKey = vscodeConfig.get<string>("legacyApiKey") || "";
        const baseUrl = vscodeConfig.get<string>("controlServiceUrl") || "http://localhost:4000";

        config.baseURL = baseUrl;

        // Apply auth headers
        if (authMode === "bearer-session") {
          const session = SessionManager.getInstance();
          if (session.token) {
            config.headers.Authorization = `Bearer ${session.token}`;
          }
        } else if (authMode === "legacy-api-key") {
          if (legacyApiKey) {
            config.headers["x-api-key"] = legacyApiKey;
          }
        }

        return config;
      });
    }

    return ApiClient.instance;
  }
}

export const ckuApi = ApiClient.getInstance();
