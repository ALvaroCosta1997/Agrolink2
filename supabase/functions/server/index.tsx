import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ── Helper: get authenticated user ──────────────────────────────
const getAuthUser = async (authHeader: string | null) => {
  const token = authHeader?.split("Bearer ")[1];
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

const PREFIX = "/make-server-3243d623";

// ── Health ───────────────────────────────────────────────────────
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ══════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════
app.post(`${PREFIX}/auth/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email e password são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split("@")[0] },
      // Automatically confirm since no email server is configured
      email_confirm: true,
    });

    if (error) {
      console.log("Signup error:", error.message);
      return c.json(
        { error: `Erro ao criar conta: ${error.message}` },
        400
      );
    }

    // Create initial profile in KV
    const profile = {
      id: data.user.id,
      name: name || email.split("@")[0],
      email,
      phoneNumber: "",
      phoneCountry: "+351",
      region: "",
      mode: "AMBOS",
      isFirstLogin: true,
      draftMessage:
        "Boa tarde, vi o seu anúncio no AgroLink e estou interessado. Ainda está disponível?",
      contactVisibility: {
        enabled: true,
        mode: "ALWAYS",
        startTime: "09:00",
        endTime: "19:00",
      },
    };
    await kv.set(`profile:${data.user.id}`, profile);

    return c.json({ user: data.user, profile });
  } catch (err) {
    console.log("Signup exception:", err);
    return c.json({ error: `Erro interno no signup: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/profile`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (profile GET)" }, 401);

    const profile = await kv.get(`profile:${user.id}`);
    return c.json({ profile: profile || null });
  } catch (err) {
    console.log("Profile GET error:", err);
    return c.json({ error: `Erro ao obter perfil: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/profile`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (profile PUT)" }, 401);

    const updates = await c.req.json();
    const existing = (await kv.get(`profile:${user.id}`)) || {};
    const updated = { ...existing, ...updates, id: user.id };
    await kv.set(`profile:${user.id}`, updated);

    return c.json({ profile: updated });
  } catch (err) {
    console.log("Profile PUT error:", err);
    return c.json({ error: `Erro ao atualizar perfil: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/listings`, async (c) => {
  try {
    const listings = await kv.getByPrefix("listing:");
    // Sort by createdAt descending
    const sorted = (listings || []).sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ listings: sorted });
  } catch (err) {
    console.log("Listings GET error:", err);
    return c.json({ error: `Erro ao obter anúncios: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/listings`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (listing POST)" }, 401);

    const listing = await c.req.json();
    listing.sellerId = user.id;
    listing.id = listing.id || `l_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    listing.createdAt = listing.createdAt || new Date().toISOString();
    listing.status = listing.status || "Ativo";

    await kv.set(`listing:${listing.id}`, listing);
    return c.json({ listing });
  } catch (err) {
    console.log("Listing POST error:", err);
    return c.json({ error: `Erro ao criar anúncio: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/listings/:id`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (listing PUT)" }, 401);

    const id = c.req.param("id");
    const existing = await kv.get(`listing:${id}`);
    if (!existing) return c.json({ error: "Anúncio não encontrado" }, 404);
    if (existing.sellerId !== user.id)
      return c.json({ error: "Sem permissão para editar este anúncio" }, 403);

    const updates = await c.req.json();
    const updated = { ...existing, ...updates, id, sellerId: user.id };
    await kv.set(`listing:${id}`, updated);

    return c.json({ listing: updated });
  } catch (err) {
    console.log("Listing PUT error:", err);
    return c.json({ error: `Erro ao atualizar anúncio: ${err}` }, 500);
  }
});

app.delete(`${PREFIX}/listings/:id`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (listing DELETE)" }, 401);

    const id = c.req.param("id");
    const existing = await kv.get(`listing:${id}`);
    if (!existing) return c.json({ error: "Anúncio não encontrado" }, 404);
    if (existing.sellerId !== user.id)
      return c.json({ error: "Sem permissão" }, 403);

    await kv.del(`listing:${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log("Listing DELETE error:", err);
    return c.json({ error: `Erro ao eliminar anúncio: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/favorites`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (favorites GET)" }, 401);

    const favs = await kv.get(`favorites:${user.id}`);
    return c.json({ favorites: favs || [] });
  } catch (err) {
    console.log("Favorites GET error:", err);
    return c.json({ error: `Erro ao obter favoritos: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/favorites`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (favorites PUT)" }, 401);

    const { favorites } = await c.req.json();
    await kv.set(`favorites:${user.id}`, favorites);
    return c.json({ favorites });
  } catch (err) {
    console.log("Favorites PUT error:", err);
    return c.json({ error: `Erro ao guardar favoritos: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// CHATS
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/chats`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado (chats GET)" }, 401);

    const chatIds = (await kv.get(`user_chats:${user.id}`)) || [];
    if (chatIds.length === 0) return c.json({ chats: [] });

    const chatKeys = chatIds.map((id: string) => `chat:${id}`);
    // Fetch in batches to avoid huge queries
    const chats: any[] = [];
    for (const key of chatKeys) {
      const chat = await kv.get(key);
      if (chat) chats.push(chat);
    }

    // Sort by lastUpdate descending
    chats.sort(
      (a: any, b: any) =>
        new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
    );
    return c.json({ chats });
  } catch (err) {
    console.log("Chats GET error:", err);
    return c.json({ error: `Erro ao obter chats: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/chats`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado (chat POST)" }, 401);

    const chat = await c.req.json();
    chat.id = chat.id || `chat_${Date.now()}`;

    await kv.set(`chat:${chat.id}`, chat);

    // Add to both users' chat indexes
    for (const uId of [chat.buyerId, chat.sellerId]) {
      const existing = (await kv.get(`user_chats:${uId}`)) || [];
      if (!existing.includes(chat.id)) {
        await kv.set(`user_chats:${uId}`, [...existing, chat.id]);
      }
    }

    return c.json({ chat });
  } catch (err) {
    console.log("Chat POST error:", err);
    return c.json({ error: `Erro ao criar chat: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/chats/:chatId/messages`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (message POST)" }, 401);

    const chatId = c.req.param("chatId");
    const chat = await kv.get(`chat:${chatId}`);
    if (!chat) return c.json({ error: "Chat não encontrado" }, 404);

    const { text } = await c.req.json();
    const message = {
      id: `msg_${Date.now()}`,
      text,
      senderId: user.id,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    chat.messages = [...(chat.messages || []), message];
    chat.lastUpdate = new Date().toISOString();
    await kv.set(`chat:${chatId}`, chat);

    return c.json({ message, chat });
  } catch (err) {
    console.log("Message POST error:", err);
    return c.json({ error: `Erro ao enviar mensagem: ${err}` }, 500);
  }
});

app.delete(`${PREFIX}/chats/:chatId`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user)
      return c.json({ error: "Não autorizado (chat DELETE)" }, 401);

    const chatId = c.req.param("chatId");
    await kv.del(`chat:${chatId}`);

    // Remove from user's chat index
    const existing = (await kv.get(`user_chats:${user.id}`)) || [];
    await kv.set(
      `user_chats:${user.id}`,
      existing.filter((id: string) => id !== chatId)
    );

    return c.json({ success: true });
  } catch (err) {
    console.log("Chat DELETE error:", err);
    return c.json({ error: `Erro ao eliminar chat: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// SEED - Populate initial demo data (public, idempotent)
// ══════════════════════════════════════════════════════════════════
app.post(`${PREFIX}/seed`, async (c) => {
  try {
    // Check if already seeded
    const marker = await kv.get("seed:done");
    if (marker) return c.json({ message: "Dados já existem", seeded: false });

    const { listings } = await c.req.json();
    if (!listings || !Array.isArray(listings)) {
      return c.json({ error: "Listings array obrigatório" }, 400);
    }

    // Store each listing
    const keys = listings.map((l: any) => `listing:${l.id}`);
    await kv.mset(keys, listings);

    // Mark as seeded
    await kv.set("seed:done", { seededAt: new Date().toISOString(), count: listings.length });

    return c.json({
      message: `${listings.length} anúncios seed criados`,
      seeded: true,
    });
  } catch (err) {
    console.log("Seed error:", err);
    return c.json({ error: `Erro no seed: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
