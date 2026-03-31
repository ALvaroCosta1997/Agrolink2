/**
 * AgrowLink API — frontend helper for communicating with the Supabase Edge Function server.
 * All data flows through this module instead of localStorage.
 */

import { projectId, publicAnonKey } from "/utils/supabase/info";
import { createClient } from "@supabase/supabase-js";
import type { Listing, Chat, User as UserType } from "./types";

// ── Supabase client (singleton) ─────────────────────────────────
const supabaseUrl = `https://${projectId}.supabase.co`;
export const supabase = createClient(supabaseUrl, publicAnonKey);

const API_BASE = `${supabaseUrl}/functions/v1/make-server-3243d623`;

// ── Internal helpers ────────────────────────────────────────────
const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
};

const headers = async (auth = false): Promise<Record<string, string>> => {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = await getAccessToken();
    h["Authorization"] = `Bearer ${token || publicAnonKey}`;
  } else {
    h["Authorization"] = `Bearer ${publicAnonKey}`;
  }
  return h;
};

const handleResponse = async (res: Response) => {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    throw new Error("Resposta inválida do servidor");
  }
  if (!res.ok) {
    console.error(`API Error [${res.status}]:`, data);
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
};

// ══════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════
export const auth = {
  /**
   * Sign up a new user via standard client-side Supabase Auth.
   * Returns { user, needsConfirmation } — if needsConfirmation is true,
   * the user must click the confirmation email before they can log in.
   */
  async signup(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split("@")[0] },
      },
    });
    if (error) throw new Error(`Erro ao criar conta: ${error.message}`);
    const needsConfirmation = !data.user?.email_confirmed_at;
    return { user: data.user, needsConfirmation };
  },

  /**
   * Sign in with email + password. Returns session with access_token.
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(`Erro ao entrar: ${error.message}`);
    return data;
  },

  /**
   * Sign out.
   */
  async logout() {
    await supabase.auth.signOut();
  },

  /**
   * Get current session (for returning users).
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Erro ao obter sessão: ${error.message}`);
    return data.session;
  },

  /**
   * Listen for auth state changes.
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ══════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════
export const profile = {
  async get(): Promise<UserType | null> {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: await headers(true),
    });
    const data = await handleResponse(res);
    return data.profile;
  },

  async update(updates: Partial<UserType>): Promise<UserType> {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: await headers(true),
      body: JSON.stringify(updates),
    });
    const data = await handleResponse(res);
    return data.profile;
  },
};

// ══════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════
export const listings = {
  async getAll(): Promise<Listing[]> {
    const res = await fetch(`${API_BASE}/listings`, {
      headers: await headers(),
    });
    const data = await handleResponse(res);
    return data.listings || [];
  },

  async create(listing: Listing): Promise<Listing> {
    const res = await fetch(`${API_BASE}/listings`, {
      method: "POST",
      headers: await headers(true),
      body: JSON.stringify(listing),
    });
    const data = await handleResponse(res);
    return data.listing;
  },

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      method: "PUT",
      headers: await headers(true),
      body: JSON.stringify(updates),
    });
    const data = await handleResponse(res);
    return data.listing;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      method: "DELETE",
      headers: await headers(true),
    });
    await handleResponse(res);
  },
};

// ══════════════════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════════════════
export const favorites = {
  async get(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/favorites`, {
      headers: await headers(true),
    });
    const data = await handleResponse(res);
    return data.favorites || [];
  },

  async save(ids: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/favorites`, {
      method: "PUT",
      headers: await headers(true),
      body: JSON.stringify({ favorites: ids }),
    });
    await handleResponse(res);
  },
};

// ══════════════════════════════════════════════════════════════════
// CHATS
// ══════════════════════════════════════════════════════════════════
export const chats = {
  async getAll(): Promise<Chat[]> {
    const res = await fetch(`${API_BASE}/chats`, {
      headers: await headers(true),
    });
    const data = await handleResponse(res);
    return data.chats || [];
  },

  async create(chat: Chat): Promise<Chat> {
    const res = await fetch(`${API_BASE}/chats`, {
      method: "POST",
      headers: await headers(true),
      body: JSON.stringify(chat),
    });
    const data = await handleResponse(res);
    return data.chat;
  },

  async sendMessage(chatId: string, text: string) {
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: "POST",
      headers: await headers(true),
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  async remove(chatId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "DELETE",
      headers: await headers(true),
    });
    await handleResponse(res);
  },
};

// ══════════════════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════════════════
export const seed = {
  async run(seedListings: Listing[]): Promise<{ seeded: boolean }> {
    const res = await fetch(`${API_BASE}/seed`, {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ listings: seedListings }),
    });
    return handleResponse(res);
  },
};
