/**
 * AgrowLink API — direct Supabase client calls.
 * No Edge Function involved. All operations go through the Supabase JS client.
 */

import { projectId, publicAnonKey } from "/utils/supabase/info";
import { createClient } from "@supabase/supabase-js";
import type { Listing, Chat, ChatMessage, User as UserType } from "./types";

// ── Supabase client (singleton) ─────────────────────────────────
const supabaseUrl = `https://${projectId}.supabase.co`;
export const supabase = createClient(supabaseUrl, publicAnonKey);

// ── Row → frontend type mappers ──────────────────────────────────
const rowToProfile = (row: any): UserType => ({
  id: row.id,
  name: row.name || "",
  email: row.email || "",
  isLoggedIn: true,
  phoneNumber: row.phone_number || "",
  phoneCountry: row.phone_country || "+351",
  region: row.region || "",
  mode: row.mode || "AMBOS",
  draftMessage: row.draft_message || "",
  isFirstLogin: row.is_first_login ?? true,
  contactVisibility: {
    enabled: row.show_contacts ?? true,
    mode: row.contact_schedule === "schedule" ? "SCHEDULE" : "ALWAYS",
    startTime: row.contact_from ? String(row.contact_from).slice(0, 5) : "09:00",
    endTime: row.contact_until ? String(row.contact_until).slice(0, 5) : "19:00",
  },
});

const rowToListing = (row: any): Listing => ({
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

const rowToChatMessage = (row: any): ChatMessage => ({
  id: row.id,
  text: row.text,
  senderId: row.sender_id,
  timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const rowToChat = (row: any): Chat => ({
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

// Full insert row (all required fields)
const listingToRow = (listing: Listing, userId: string) => ({
  seller_id: userId,
  species: listing.species,
  life_stage: listing.lifeStage,
  breed: listing.breed || null,
  male_qty: listing.maleQty ?? 0,
  female_qty: listing.femaleQty ?? 0,
  male_price: listing.malePrice != null && listing.malePrice !== "" ? Number(listing.malePrice) : null,
  female_price: listing.femalePrice != null && listing.femalePrice !== "" ? Number(listing.femalePrice) : null,
  male_avg_weight: listing.maleAvgWeight != null && (listing.maleAvgWeight as any) !== "" ? Number(listing.maleAvgWeight) : null,
  female_avg_weight: listing.femaleAvgWeight != null && (listing.femaleAvgWeight as any) !== "" ? Number(listing.femaleAvgWeight) : null,
  price_mode: listing.priceMode || "FIXED",
  description: listing.description || "",
  status: listing.status || "Ativo",
  photos: listing.photos || [],
  tags: (listing as any).tags || [],
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

// Partial update row (only include defined fields)
const listingUpdatesToRow = (updates: Partial<Listing>) => {
  const row: any = {};
  if (updates.species !== undefined) row.species = updates.species;
  if (updates.lifeStage !== undefined) row.life_stage = updates.lifeStage;
  if (updates.breed !== undefined) row.breed = updates.breed || null;
  if (updates.maleQty !== undefined) row.male_qty = updates.maleQty;
  if (updates.femaleQty !== undefined) row.female_qty = updates.femaleQty;
  if (updates.malePrice !== undefined) row.male_price = updates.malePrice != null && (updates.malePrice as any) !== "" ? Number(updates.malePrice) : null;
  if (updates.femalePrice !== undefined) row.female_price = updates.femalePrice != null && (updates.femalePrice as any) !== "" ? Number(updates.femalePrice) : null;
  if (updates.maleAvgWeight !== undefined) row.male_avg_weight = updates.maleAvgWeight != null && (updates.maleAvgWeight as any) !== "" ? Number(updates.maleAvgWeight) : null;
  if (updates.femaleAvgWeight !== undefined) row.female_avg_weight = updates.femaleAvgWeight != null && (updates.femaleAvgWeight as any) !== "" ? Number(updates.femaleAvgWeight) : null;
  if (updates.priceMode !== undefined) row.price_mode = updates.priceMode;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.photos !== undefined) row.photos = updates.photos || [];
  if ((updates as any).tags !== undefined) row.tags = (updates as any).tags || [];
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

// ══════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════
export const auth = {
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

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(`Erro ao entrar: ${error.message}`);
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Erro ao obter sessão: ${error.message}`);
    return data.session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ══════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════
export const profile = {
  async get(): Promise<UserType | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToProfile(data) : null;
  },

  async update(updates: Partial<UserType>): Promise<UserType> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado");
    const row: any = { id: user.id };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.email !== undefined) row.email = updates.email;
    if ((updates as any).phoneNumber !== undefined) row.phone_number = (updates as any).phoneNumber;
    if ((updates as any).phoneCountry !== undefined) row.phone_country = (updates as any).phoneCountry;
    if (updates.region !== undefined) row.region = updates.region;
    if (updates.mode !== undefined) row.mode = updates.mode;
    if ((updates as any).draftMessage !== undefined) row.draft_message = (updates as any).draftMessage;
    if ((updates as any).isFirstLogin !== undefined) row.is_first_login = (updates as any).isFirstLogin;
    if ((updates as any).contactVisibility !== undefined) {
      const cv = (updates as any).contactVisibility;
      row.show_contacts = cv.enabled;
      row.contact_schedule = cv.mode === "SCHEDULE" ? "schedule" : "always";
      row.contact_from = cv.startTime;
      row.contact_until = cv.endTime;
    }
    const { data, error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToProfile(data);
  },

  async getSellerVisibility(userId: string): Promise<{
    enabled: boolean;
    mode: "ALWAYS" | "SCHEDULE";
    startTime: string;
    endTime: string;
  }> {
    const { data } = await supabase
      .from("profiles")
      .select("show_contacts, contact_schedule, contact_from, contact_until")
      .eq("id", userId)
      .maybeSingle();
    return {
      enabled: data?.show_contacts ?? true,
      mode: data?.contact_schedule === "schedule" ? "SCHEDULE" : "ALWAYS",
      startTime: data?.contact_from ? String(data.contact_from).slice(0, 5) : "09:00",
      endTime: data?.contact_until ? String(data.contact_until).slice(0, 5) : "19:00",
    };
  },
};

// ══════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════
export const listings = {
  async getAll(): Promise<Listing[]> {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToListing);
  },

  async create(listing: Listing): Promise<Listing> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado");
    const { data, error } = await supabase
      .from("listings")
      .insert(listingToRow(listing, user.id))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToListing(data);
  },

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const { data, error } = await supabase
      .from("listings")
      .update(listingUpdatesToRow(updates))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToListing(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};

// ══════════════════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════════════════
export const favorites = {
  async get(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => r.listing_id);
  },

  async add(listingId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, listing_id: listingId });
    if (error && error.code !== "23505") throw new Error(error.message); // ignore duplicate
  },

  async remove(listingId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) throw new Error(error.message);
  },

  /** @deprecated use add/remove — kept for compatibility */
  async save(ids: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("favorites")
        .insert(ids.map((listing_id) => ({ user_id: user.id, listing_id })));
      if (error) throw new Error(error.message);
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// CHATS
// ══════════════════════════════════════════════════════════════════
export const chats = {
  async getAll(): Promise<Chat[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("last_update", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToChat);
  },

  async create(chat: Chat): Promise<Chat> {
    const { data, error } = await supabase
      .from("chats")
      .insert({
        listing_id: chat.listingId,
        seller_id: chat.sellerId,
        buyer_id: chat.buyerId,
        last_update: new Date().toISOString(),
        messages: chat.messages || [],
        listing_title: chat.listingTitle || "",
        listing_preview: chat.listingPreview || "",
        user_name: chat.userName || "",
        unread: chat.unread ?? false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToChat(data);
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToChatMessage);
  },

  async sendMessage(chatId: string, text: string): Promise<ChatMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    // Insert into chat_messages (id auto-generated by DB)
    const { data: msgRow, error: insertErr } = await supabase
      .from("chat_messages")
      .insert({ chat_id: chatId, sender_id: user.id, text })
      .select("*")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    // Update chats: last_update, mark unread, store last message for list preview
    const previewMsg = [{
      id: msgRow.id,
      text,
      senderId: user.id,
      timestamp: new Date(msgRow.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }];
    const { error: updateErr } = await supabase
      .from("chats")
      .update({ last_update: msgRow.created_at, unread: true, messages: previewMsg })
      .eq("id", chatId);
    if (updateErr) throw new Error(updateErr.message);

    return rowToChatMessage(msgRow);
  },

  async remove(chatId: string): Promise<void> {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) throw new Error(error.message);
  },
};

// ══════════════════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════════════════
export const seed = {
  async run(seedListings: Listing[]): Promise<{ seeded: boolean }> {
    const { count } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);
    if (count && count > 0) return { seeded: false };
    const { data: { user } } = await supabase.auth.getUser();
    const rows = seedListings.map((l) =>
      listingToRow(l, (l as any).sellerId || user?.id || "00000000-0000-0000-0000-000000000000")
    );
    const { error } = await supabase.from("listings").insert(rows);
    if (error) throw new Error(error.message);
    return { seeded: true };
  },
};
