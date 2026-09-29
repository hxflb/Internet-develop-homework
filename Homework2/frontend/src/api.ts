export type Me = { user_id: number; username: string; role: "teacher" | "student"; class_id: number };
export type Klass = { id: number; name: string };
export type Material = { id: number; title: string; class_id: number; uploader?: string; created_at?: string; body_text?: string };

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  const text = await res.text();
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) {
    const err = new Error(String((data as { error?: string }).error || res.status));
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  me: () => req<Me>("/api/me"),
  login: (username: string, password: string) =>
    req<{ ok: boolean; role: string; class_id: number }>("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req("/api/logout", { method: "POST" }),
  classes: () => req<{ items: Klass[] }>("/api/classes"),
  materials: (classId?: number, q?: string) => {
    const p = new URLSearchParams();
    if (classId) p.set("class_id", String(classId));
    if (q) p.set("q", q);
    return req<{ items: Material[] }>(`/api/materials?${p.toString()}`);
  },
  one: (id: number) => req<Material>(`/api/materials/${id}`),
  fileUrl: (id: number) => `/api/materials/${id}/file`,
  upload: (fd: FormData) =>
    req<{ material_id: number }>("/api/materials", { method: "POST", body: fd }),
  update: (id: number, fd: FormData) =>
    req(`/api/materials/${id}`, { method: "PUT", body: fd }),
  remove: (id: number) => req(`/api/materials/${id}`, { method: "DELETE" }),
  search: (query: string, mode: string) =>
    req<{ mode: string; hits: SearchHit[] }>("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode, class_id: 999 }),
    }),
  ask: (query: string, messages: { role: string; content: string }[] = []) =>
    req<{ answer: string; citations: Citation[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, messages, system: "ignore me", class_id: 999 }),
    }),
  reindex: (id: number, strategy: string) =>
    req(`/api/materials/${id}/reindex`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy }),
    }),
};

export type SearchHit = {
  chunk_id: number;
  material_id: number;
  material_title: string;
  chunk_index: number;
  char_start: number;
  char_end: number;
  excerpt: string;
};

export type Citation = {
  n: number;
  material_id: number;
  material_title: string;
  chunk_index: number;
  excerpt: string;
};
