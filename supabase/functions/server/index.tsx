import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const db = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const getAuthUser = async (authHeader: string | null) => {
  const token = authHeader?.split("Bearer ")[1];
  if (!token) return null;
  const { data: { user }, error } = await db().auth.getUser(token);
  if (error || !user) return null;
  return user;
};

const errMsg = (err: any): string =>
  err?.message || (typeof err === "string" ? err : JSON.stringify(err));

const PREFIX = "/make-server-3243d623";

// ── Profile helpers ───────────────────────────────────────────────
const rowToProfile = (row: any) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phoneNumber: row.phone_number || "",
  phoneCountry: row.phone_country || "+351",
  region: row.region || "",
  mode: row.mode || "AMBOS",
  draftMessage: row.draft_message || "Boa tarde, vi o seu anúncio no AgrowLink e estou interessado. Ainda está disponível?",
  isFirstLogin: row.is_first_login ?? true,
  contactVisibility: {
    enabled: row.contact_visibility_enabled ?? true,
    mode: row.contact_visibility_mode === "SCHEDULE" ? "SCHEDULE" : "ALWAYS",
    startTime: row.contact_visibility_start ? String(row.contact_visibility_start).slice(0, 5) : "09:00",
    endTime: row.contact_visibility_end ? String(row.contact_visibility_end).slice(0, 5) : "19:00",
  },
});

// ── Listing helpers ───────────────────────────────────────────────
const rowToListing = (row: any) => ({
  id: row.id,
  sellerId: row.seller_id,
  species: row.species,
  lifeStage: row.life_stage,
  breed: row.breed,
  maleQty: row.male_qty,
  femaleQty: row.female_qty,
  malePrice: row.male_price,
  femalePrice: row.female_price,
  maleAvgWeight: row.male_avg_weight,
  femaleAvgWeight: row.female_avg_weight,
  priceMode: row.price_mode,
  description: row.description,
  status: row.status,
  photos: row.photos || [],
  tags: row.tags || [],
  location: {
    lat: row.lat,
    lng: row.lng,
    municipality: row.municipality,
    freguesia: row.freguesia,
    address: row.address,
    showExactLocation: row.show_exact_location,
  },
  contacts: {
    phone: row.contact_phone,
    whatsapp: row.contact_whatsapp,
    name: row.contact_name,
  },
  stats: {
    views: row.views_count || 0,
    contacts: row.contacts_count || 0,
    saves: row.saves_count || 0,
  },
  createdAt: row.created_at,
});

// Full row for INSERT — all required fields must be present
const listingToRow = (listing: any, userId: string) => ({
  seller_id: userId,
  species: listing.species,
  life_stage: listing.lifeStage,
  breed: listing.breed || null,
  male_qty: listing.maleQty ?? 0,
  female_qty: listing.femaleQty ?? 0,
  male_price: listing.malePrice != null && listing.malePrice !== "" ? Number(listing.malePrice) : null,
  female_price: listing.femalePrice != null && listing.femalePrice !== "" ? Number(listing.femalePrice) : null,
  male_avg_weight: listing.maleAvgWeight != null && listing.maleAvgWeight !== "" ? Number(listing.maleAvgWeight) : null,
  female_avg_weight: listing.femaleAvgWeight != null && listing.femaleAvgWeight !== "" ? Number(listing.femaleAvgWeight) : null,
  price_mode: listing.priceMode || "unit",
  description: listing.description || "",
  status: listing.status || "Ativo",
  photos: listing.photos || [],
  tags: listing.tags || [],
  municipality: listing.location?.municipality || "",
  freguesia: listing.location?.freguesia || "",
  address: listing.location?.address || null,
  lat: listing.location?.lat ?? 0,
  lng: listing.location?.lng ?? 0,
  show_exact_location: listing.location?.showExactLocation ?? false,
  contact_name: listing.contacts?.name || "",
  contact_phone: listing.contacts?.phone || "",
  contact_whatsapp: listing.contacts?.whatsapp ?? false,
  views_count: listing.stats?.views ?? 0,
  contacts_count: listing.stats?.contacts ?? 0,
  saves_count: listing.stats?.saves ?? 0,
});

// Partial row for UPDATE — only include fields that are actually provided
const listingUpdatesToRow = (updates: any) => {
  const row: any = {};
  if (updates.species !== undefined) row.species = updates.species;
  if (updates.lifeStage !== undefined) row.life_stage = updates.lifeStage;
  if (updates.breed !== undefined) row.breed = updates.breed || null;
  if (updates.maleQty !== undefined) row.male_qty = updates.maleQty;
  if (updates.femaleQty !== undefined) row.female_qty = updates.femaleQty;
  if (updates.malePrice !== undefined) row.male_price = updates.malePrice != null && updates.malePrice !== "" ? Number(updates.malePrice) : null;
  if (updates.femalePrice !== undefined) row.female_price = updates.femalePrice != null && updates.femalePrice !== "" ? Number(updates.femalePrice) : null;
  if (updates.maleAvgWeight !== undefined) row.male_avg_weight = updates.maleAvgWeight != null && updates.maleAvgWeight !== "" ? Number(updates.maleAvgWeight) : null;
  if (updates.femaleAvgWeight !== undefined) row.female_avg_weight = updates.femaleAvgWeight != null && updates.femaleAvgWeight !== "" ? Number(updates.femaleAvgWeight) : null;
  if (updates.priceMode !== undefined) row.price_mode = updates.priceMode;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.photos !== undefined) row.photos = updates.photos || [];
  if (updates.tags !== undefined) row.tags = updates.tags || [];
  if (updates.location !== undefined) {
    if (updates.location.municipality !== undefined) row.municipality = updates.location.municipality;
    if (updates.location.freguesia !== undefined) row.freguesia = updates.location.freguesia;
    if (updates.location.address !== undefined) row.address = updates.location.address || null;
    if (updates.location.lat !== undefined) row.lat = updates.location.lat;
    if (updates.location.lng !== undefined) row.lng = updates.location.lng;
    if (updates.location.showExactLocation !== undefined) row.show_exact_location = updates.location.showExactLocation;
  }
  if (updates.contacts !== undefined) {
    if (updates.contacts.name !== undefined) row.contact_name = updates.contacts.name;
    if (updates.contacts.phone !== undefined) row.contact_phone = updates.contacts.phone;
    if (updates.contacts.whatsapp !== undefined) row.contact_whatsapp = updates.contacts.whatsapp;
  }
  if (updates.stats !== undefined) {
    if (updates.stats.views !== undefined) row.views_count = updates.stats.views;
    if (updates.stats.contacts !== undefined) row.contacts_count = updates.stats.contacts;
    if (updates.stats.saves !== undefined) row.saves_count = updates.stats.saves;
  }
  return row;
};

// ── Chat helpers ───────────────────────────────────────────────────
const rowToChat = (row: any) => ({
  id: row.id,
  listingId: row.listing_id,
  sellerId: row.seller_id,
  buyerId: row.buyer_id,
  messages: row.messages || [],
  lastUpdate: row.last_update,
  listingTitle: row.listing_title || "",
  listingPreview: row.listing_preview || "",
  userName: row.user_name || "",
  unread: row.unread || false,
  isDeleted: row.is_deleted || false,
});

// Health
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ══════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════
app.post(`${PREFIX}/auth/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email e password são obrigatórios" }, 400);
    const supabase = db();
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { name: name || email.split("@")[0] },
      email_confirm: true,
    });
    if (error) return c.json({ error: `Erro ao criar conta: ${error.message}` }, 400);
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name: name || email.split("@")[0],
      email,
      phone_number: "",
      phone_country: "+351",
      region: "",
      mode: "AMBOS",
      draft_message: "Boa tarde, vi o seu anúncio no AgrowLink e estou interessado. Ainda está disponível?",
      is_first_login: true,
      contact_visibility_enabled: true,
      contact_visibility_mode: "ALWAYS",
      contact_visibility_start: "09:00",
      contact_visibility_end: "19:00",
    }, { onConflict: "id" });
    if (profileErr) console.log("Profile create error:", profileErr.message);
    const profile = rowToProfile({
      id: data.user.id, name: name || email.split("@")[0], email,
      phone_number: "", phone_country: "+351", region: "", mode: "AMBOS",
      draft_message: "Boa tarde, vi o seu anúncio no AgrowLink e estou interessado. Ainda está disponível?",
      is_first_login: true, contact_visibility_enabled: true,
      contact_visibility_mode: "ALWAYS", contact_visibility_start: "09:00", contact_visibility_end: "19:00",
    });
    return c.json({ user: data.user, profile });
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: `Signup error: ${errMsg(err)}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/profile`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const { data, error } = await db().from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return c.json({ profile: data ? rowToProfile(data) : null });
  } catch (err) {
    console.log("Profile GET error:", err);
    return c.json({ error: `Profile GET error: ${errMsg(err)}` }, 500);
  }
});

app.put(`${PREFIX}/profile`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const updates = await c.req.json();
    const row: any = { id: user.id };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.email !== undefined) row.email = updates.email;
    if (updates.phoneNumber !== undefined) row.phone_number = updates.phoneNumber;
    if (updates.phoneCountry !== undefined) row.phone_country = updates.phoneCountry;
    if (updates.region !== undefined) row.region = updates.region;
    if (updates.mode !== undefined) row.mode = updates.mode;
    if (updates.draftMessage !== undefined) row.draft_message = updates.draftMessage;
    if (updates.isFirstLogin !== undefined) row.is_first_login = updates.isFirstLogin;
    if (updates.contactVisibility !== undefined) {
      row.contact_visibility_enabled = updates.contactVisibility.enabled;
      row.contact_visibility_mode = updates.contactVisibility.mode;
      row.contact_visibility_start = updates.contactVisibility.startTime;
      row.contact_visibility_end = updates.contactVisibility.endTime;
    }
    const { data, error } = await db().from("profiles").upsert(row, { onConflict: "id" }).select("*").single();
    if (error) throw error;
    return c.json({ profile: rowToProfile(data) });
  } catch (err) {
    console.log("Profile PUT error:", err);
    return c.json({ error: `Profile PUT error: ${errMsg(err)}` }, 500);
  }
});

// ── Seller contact visibility (public) ─────────────────────────────
app.get(`${PREFIX}/seller/:userId/contact-visibility`, async (c) => {
  try {
    const userId = c.req.param("userId");
    const { data } = await db().from("profiles")
      .select("contact_visibility_enabled, contact_visibility_mode, contact_visibility_start, contact_visibility_end")
      .eq("id", userId).maybeSingle();
    return c.json({
      enabled: data?.contact_visibility_enabled ?? true,
      mode: data?.contact_visibility_mode === "SCHEDULE" ? "SCHEDULE" : "ALWAYS",
      startTime: data?.contact_visibility_start ? String(data.contact_visibility_start).slice(0, 5) : "09:00",
      endTime: data?.contact_visibility_end ? String(data.contact_visibility_end).slice(0, 5) : "19:00",
    });
  } catch (err) {
    console.log("Seller visibility error:", err);
    return c.json({ error: `Seller visibility error: ${errMsg(err)}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/listings`, async (c) => {
  try {
    const { data, error } = await db().from("listings")
      .select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ listings: (data || []).map(rowToListing) });
  } catch (err) {
    console.log("Listings GET error:", err);
    return c.json({ error: `Listings GET error: ${errMsg(err)}` }, 500);
  }
});

app.post(`${PREFIX}/listings`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const listing = await c.req.json();
    const row = listingToRow(listing, user.id);
    console.log("Creating listing row:", JSON.stringify(row));
    const { data, error } = await db().from("listings").insert(row).select("*").single();
    if (error) throw error;
    return c.json({ listing: rowToListing(data) });
  } catch (err) {
    console.log("Listing POST error:", err);
    return c.json({ error: `Listing POST error: ${errMsg(err)}` }, 500);
  }
});

app.put(`${PREFIX}/listings/:id`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const id = c.req.param("id");
    const { data: existing, error: fetchErr } = await db().from("listings").select("seller_id").eq("id", id).single();
    if (fetchErr || !existing) return c.json({ error: "Anúncio não encontrado" }, 404);
    if (existing.seller_id !== user.id) return c.json({ error: "Sem permissão" }, 403);
    const updates = await c.req.json();
    const row = listingUpdatesToRow(updates);
    console.log("Updating listing row:", JSON.stringify(row));
    const { data, error } = await db().from("listings").update(row).eq("id", id).select("*").single();
    if (error) throw error;
    return c.json({ listing: rowToListing(data) });
  } catch (err) {
    console.log("Listing PUT error:", err);
    return c.json({ error: `Listing PUT error: ${errMsg(err)}` }, 500);
  }
});

app.delete(`${PREFIX}/listings/:id`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const id = c.req.param("id");
    const { data: existing } = await db().from("listings").select("seller_id").eq("id", id).single();
    if (!existing) return c.json({ error: "Anúncio não encontrado" }, 404);
    if (existing.seller_id !== user.id) return c.json({ error: "Sem permissão" }, 403);
    const { error } = await db().from("listings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log("Listing DELETE error:", err);
    return c.json({ error: `Listing DELETE error: ${errMsg(err)}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/favorites`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const { data, error } = await db().from("favorites").select("listing_id").eq("user_id", user.id);
    if (error) throw error;
    return c.json({ favorites: (data || []).map((r: any) => r.listing_id) });
  } catch (err) {
    console.log("Favorites GET error:", err);
    return c.json({ error: `Favorites GET error: ${errMsg(err)}` }, 500);
  }
});

app.put(`${PREFIX}/favorites`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const { favorites } = await c.req.json();
    const supabase = db();
    await supabase.from("favorites").delete().eq("user_id", user.id);
    if (favorites && favorites.length > 0) {
      const rows = favorites.map((id: string) => ({ user_id: user.id, listing_id: id }));
      const { error } = await supabase.from("favorites").insert(rows);
      if (error) throw error;
    }
    return c.json({ favorites: favorites || [] });
  } catch (err) {
    console.log("Favorites PUT error:", err);
    return c.json({ error: `Favorites PUT error: ${errMsg(err)}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// CHATS
// ══════════════════════════════════════════════════════════════════
app.get(`${PREFIX}/chats`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const { data, error } = await db().from("chats")
      .select("*")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("last_update", { ascending: false });
    if (error) throw error;
    return c.json({ chats: (data || []).map(rowToChat) });
  } catch (err) {
    console.log("Chats GET error:", err);
    return c.json({ error: `Chats GET error: ${errMsg(err)}` }, 500);
  }
});

app.post(`${PREFIX}/chats`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const chat = await c.req.json();
    const { data, error } = await db().from("chats").insert({
      listing_id: chat.listingId,
      seller_id: chat.sellerId,
      buyer_id: chat.buyerId,
      last_update: new Date().toISOString(),
      messages: chat.messages || [],
      listing_title: chat.listingTitle || "",
      listing_preview: chat.listingPreview || "",
      user_name: chat.userName || "",
      unread: chat.unread ?? false,
    }).select("*").single();
    if (error) throw error;
    return c.json({ chat: rowToChat(data) });
  } catch (err) {
    console.log("Chat POST error:", err);
    return c.json({ error: `Chat POST error: ${errMsg(err)}` }, 500);
  }
});

app.post(`${PREFIX}/chats/:chatId/messages`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const chatId = c.req.param("chatId");
    const { data: chatRow, error: fetchErr } = await db().from("chats").select("*").eq("id", chatId).single();
    if (fetchErr || !chatRow) return c.json({ error: "Chat não encontrado" }, 404);
    const { text } = await c.req.json();
    const message = {
      id: `msg_${Date.now()}`,
      text,
      senderId: user.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const messages = [...(chatRow.messages || []), message];
    const { error: updateErr } = await db().from("chats").update({
      messages,
      last_update: new Date().toISOString(),
    }).eq("id", chatId);
    if (updateErr) throw updateErr;
    return c.json({ message, chat: rowToChat({ ...chatRow, messages, last_update: new Date().toISOString() }) });
  } catch (err) {
    console.log("Message POST error:", err);
    return c.json({ error: `Message POST error: ${errMsg(err)}` }, 500);
  }
});

app.delete(`${PREFIX}/chats/:chatId`, async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);
    const chatId = c.req.param("chatId");
    const { error } = await db().from("chats").delete()
      .eq("id", chatId)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log("Chat DELETE error:", err);
    return c.json({ error: `Chat DELETE error: ${errMsg(err)}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════════════════
app.post(`${PREFIX}/seed`, async (c) => {
  try {
    const { listings } = await c.req.json();
    if (!listings || !Array.isArray(listings)) return c.json({ error: "Listings array obrigatório" }, 400);
    const { count } = await db().from("listings").select("*", { count: "exact", head: true }).is("deleted_at", null);
    if (count && count > 0) return c.json({ message: "Dados já existem", seeded: false });
    const rows = listings.map((l: any) => listingToRow(l, l.sellerId || "00000000-0000-0000-0000-000000000000"));
    const { error } = await db().from("listings").insert(rows);
    if (error) throw error;
    return c.json({ message: `${listings.length} anúncios seed criados`, seeded: true });
  } catch (err) {
    console.log("Seed error:", err);
    return c.json({ error: `Seed error: ${errMsg(err)}` }, 500);
  }
});

Deno.serve(app.fetch);
