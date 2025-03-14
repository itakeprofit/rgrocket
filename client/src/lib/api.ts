import { apiRequest } from "./queryClient";

// Authentication
export async function login(username: string, password: string, rememberMe: boolean = false) {
  const res = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe });
  return res.json();
}

export async function logout() {
  const res = await apiRequest("POST", "/api/auth/logout");
  return res.json();
}

export async function getCurrentUser() {
  const res = await apiRequest("GET", "/api/auth/me");
  return res.json();
}

// Users
export async function getAllUsers() {
  const res = await apiRequest("GET", "/api/users");
  return res.json();
}

export async function createUser(userData: any) {
  const res = await apiRequest("POST", "/api/users", userData);
  return res.json();
}

export async function updateUser(id: number, userData: any) {
  const res = await apiRequest("PUT", `/api/users/${id}`, userData);
  return res.json();
}

// Settings
export async function getUserSettings() {
  const res = await apiRequest("GET", "/api/settings");
  return res.json();
}

export async function updateUserSettings(settingsData: any) {
  const res = await apiRequest("PUT", "/api/settings", settingsData);
  return res.json();
}

// Checks
export async function createCheck(data: { fileName: string, numbers: string[] }) {
  const res = await apiRequest("POST", "/api/checks", data);
  return res.json();
}

export async function getAllChecks() {
  const res = await apiRequest("GET", "/api/checks");
  return res.json();
}

export async function getCheck(id: number) {
  const res = await apiRequest("GET", `/api/checks/${id}`);
  return res.json();
}

export async function deleteCheck(id: number) {
  const res = await apiRequest("DELETE", `/api/checks/${id}`);
  return res.json();
}

export async function getCheckResults(id: number) {
  const res = await apiRequest("GET", `/api/checks/${id}/results`);
  return res.json();
}

// Logs
export async function getAllLogs() {
  const res = await apiRequest("GET", "/api/logs");
  return res.json();
}

export async function getUserLogs() {
  const res = await apiRequest("GET", "/api/my-logs");
  return res.json();
}
