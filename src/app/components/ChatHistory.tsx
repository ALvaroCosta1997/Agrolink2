import React, { useState, useMemo, useEffect } from 'react';
import { Search, MessageCircle, Phone, ArrowLeft, Send, Sparkles, Trash2, Filter, SortDesc, CheckCircle2, X, TrendingUp, Flag } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Chat, ChatMessage, User } from '../types';
import * as api from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatHistoryProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string | null) => void;
  onSendMessage: (chatId: string, text: string) => void;
  onDeleteChat: (chatId: string) => void;
  onViewDetails: (listingId: string) => void;
  currentUser: User;
  onUpdateDraft: (text: string) => void;
  onReport?: (listingId: string, reportedUserId: string, listingTitle: string) => void;
}

type FilterStatus = 'all' | 'unread' | 'recent';

export function ChatHistory({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  onSendMessage, 
  onDeleteChat,
  onViewDetails,
  currentUser,
  onUpdateDraft,
  onReport,
}: ChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showDraftSettings, setShowDraftSettings] = useState(false);
  const [draftInput, setDraftInput] = useState(currentUser?.draftMessage || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<'date' | 'unread'>('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const activeChat = chats.find(c => c.id === selectedChatId);

  // Load messages + realtime subscription when active chat changes
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setMessages([]);
    setMessagesLoading(true);

    api.chats.getMessages(selectedChatId)
      .then((msgs) => { if (!cancelled) setMessages(msgs); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setMessagesLoading(false); });

    const channel = api.supabase
      .channel(`chat-messages-${selectedChatId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${selectedChatId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.sender_id === currentUser?.id) return; // own messages shown optimistically
        setMessages(prev => [...prev, {
          id: row.id,
          text: row.text,
          senderId: row.sender_id,
          timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      api.supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  // Populate draft message when a new (empty) chat starts
  useEffect(() => {
    if (!activeChat || messagesLoading) return;
    if (messages.length === 0 && currentUser && activeChat.buyerId === currentUser.id) {
      const listingContext = activeChat.listingTitle;
      const processedMessage = currentUser.draftMessage.includes("{anuncio}")
        ? currentUser.draftMessage.replace("{anuncio}", listingContext)
        : `Olá! Estou interessado no seu anúncio "${listingContext}". ${currentUser.draftMessage}`;
      setInputText(processedMessage);
    } else {
      setInputText('');
    }
  }, [selectedChatId, messages.length, messagesLoading, currentUser?.id, currentUser?.draftMessage]);

  const [filterType, setFilterType] = useState<'compra' | 'venda'>('compra');

  const filteredAndSortedChats = useMemo(() => {
    let result = [...chats];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.userName.toLowerCase().includes(query) || 
        c.listingTitle.toLowerCase().includes(query)
      );
    }

    // Type Filter
    result = result.filter(c => {
      const type = (currentUser && c.buyerId === currentUser.id) ? 'compra' : 'venda';
      return type === filterType;
    });

    // Filter Status
    if (filterStatus === 'unread') {
      result = result.filter(c => c.unread);
    } else if (filterStatus === 'recent') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      result = result.filter(c => new Date(c.lastUpdate) > oneDayAgo);
    }

    // Sort
    return result.sort((a, b) => {
      if (sortOrder === 'unread') {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
      }
      return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
    });
  }, [chats, searchQuery, filterStatus, sortOrder, filterType, currentUser?.id]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedChatId || !currentUser) return;
    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      text: inputText,
      senderId: currentUser.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    onSendMessage(selectedChatId, inputText);
    setInputText('');
  };

  const handleSaveDraft = () => {
    onUpdateDraft(draftInput);
    setShowDraftSettings(false);
  };

  if (selectedChatId && activeChat) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 border-b flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <button onClick={() => onSelectChat(null)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-sm uppercase">
              {activeChat.userName[0]}
            </div>
            <div>
              <h3 className="font-black text-secondary leading-none text-sm">{activeChat.userName}</h3>
              <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mt-1 italic">Online agora</p>
            </div>
          </div>
          <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform">
            <Phone className="w-4 h-4" />
          </button>
          {onReport && activeChat && (
            <button
              onClick={() => {
                const sellerId = activeChat.sellerId || '';
                const reportedId = currentUser.id === activeChat.buyerId ? sellerId : activeChat.buyerId;
                onReport(activeChat.listingId, reportedId, activeChat.listingTitle);
              }}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-50 active:scale-95 transition-all"
              title="Denunciar"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-32 no-scrollbar">
        {/* Context Header with Link */}
        <div className="flex justify-center sticky top-2 z-10 px-4">
          <button 
            onClick={() => onViewDetails(activeChat.listingId)}
            className="bg-white/95 backdrop-blur-md border-2 border-primary/20 p-3 rounded-2xl flex items-center gap-4 shadow-xl max-w-sm w-full active:scale-95 transition-all group"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm bg-slate-100 border border-slate-200">
              <img src={activeChat.listingPreview} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Anúncio em Negociação</p>
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              </div>
              <p className="text-base font-black text-secondary truncate uppercase mt-1">{activeChat.listingTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">Ref: {activeChat.listingId.split('_')[1]?.toUpperCase() || activeChat.id.split('_')[1]?.toUpperCase()}</span>
                <span className="text-[10px] font-bold text-primary underline">Ver detalhes</span>
              </div>
            </div>
          </button>
        </div>

          <div className="mt-4 flex flex-col gap-4">
            {messages.map((msg) => {
              const isMe = currentUser && msg.senderId === currentUser.id;
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={msg.id}
                  className={cn(
                    "p-4 rounded-3xl max-w-[85%] shadow-sm",
                    isMe 
                      ? "bg-primary text-white self-end rounded-br-none" 
                      : "bg-white text-secondary self-start rounded-bl-none border border-slate-100"
                  )}
                >
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  <span className={cn(
                    "text-[9px] mt-2 block font-bold uppercase tracking-widest",
                    isMe ? "text-white/60" : "text-slate-400"
                  )}>{msg.timestamp}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-white border-t fixed bottom-0 left-0 right-0 md:relative" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="relative flex items-center gap-2 max-w-4xl mx-auto w-full">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escreva a sua mensagem..." 
              className="flex-1 h-14 bg-slate-100 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unreadCompra = chats.filter(c => c.buyerId === currentUser.id && c.unread).length;
  const unreadVenda  = chats.filter(c => c.sellerId === currentUser.id && c.unread).length;

  return (
    <div className="flex flex-col h-full bg-white max-w-5xl mx-auto w-full relative">
      <div className="p-8 border-b">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-5xl font-black text-secondary leading-tight">Mensagens</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Negócios e Contactos</p>
          </div>

          {/* Draft Message Card — shown above the toggle so it's always visible first */}
          <AnimatePresence>
            {filterType === 'compra' && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-primary/5 rounded-[40px] p-6 border-2 border-primary/10 relative group mb-2">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-16 h-16 text-primary" />
                  </div>
                  <div className="flex items-start gap-4 mb-4 relative z-10">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-secondary leading-none uppercase pt-1">Mensagem Automática</h3>
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">Mensagem enviada no início do chat</p>
                    </div>
                    <button 
                      onClick={() => setShowDraftSettings(!showDraftSettings)}
                      className="ml-auto px-4 py-2 bg-white rounded-xl border-2 border-primary/10 font-black text-[10px] uppercase tracking-widest text-primary shadow-sm active:scale-95 transition-all"
                    >
                      {showDraftSettings ? 'Fechar' : 'Editar'}
                    </button>
                  </div>

                  {!showDraftSettings ? (
                    <p className="text-sm font-bold text-secondary italic line-clamp-2 bg-white/50 p-4 rounded-2xl border border-white/40">
                      "{currentUser?.draftMessage?.replace('{anuncio}', '[Anúncio]') || ''}"
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="bg-white p-2 rounded-2xl">
                        <textarea 
                          value={draftInput}
                          onChange={(e) => setDraftInput(e.target.value)}
                          className="w-full h-32 bg-transparent p-4 font-bold text-secondary text-sm outline-none resize-none"
                          placeholder="Ex: Olá! Vi o seu anúncio de {anuncio} e gostaria de saber mais..."
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-bold text-slate-400 leading-tight">
                          Dica: Use <span className="text-primary font-black">{'{anuncio}'}</span> para que a app insira automaticamente o nome do gado que está a perguntar.
                        </p>
                        <button 
                          onClick={handleSaveDraft}
                          className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-5 h-5" /> Guardar Nova Mensagem
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buy/Sell Toggle — below the auto-message card, above conversations */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            {[
              { id: 'compra', label: 'COMPRAR', count: unreadCompra },
              { id: 'venda',  label: 'VENDER',  count: unreadVenda  },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={cn(
                  "relative flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  filterType === t.id
                    ? "bg-white text-secondary shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
                {t.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 leading-none"
                  >
                    {t.count}
                  </motion.span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Procurar comprador ou anúncio..." 
                className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-6 font-bold text-sm focus:border-primary transition-all outline-none shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Todas', icon: MessageCircle },
                { id: 'unread', label: 'Não Lidas', icon: Filter },
                { id: 'recent', label: 'Últimas 24h', icon: SortDesc }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id as FilterStatus)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-2",
                    filterStatus === filter.id 
                      ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20" 
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                  )}
                >
                  <filter.icon className="w-3.5 h-3.5" />
                  {filter.label}
                </button>
              ))}
              <div className="w-px h-8 bg-slate-100 mx-2 shrink-0" />
              <button
                onClick={() => setSortOrder(sortOrder === 'date' ? 'unread' : 'date')}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-2",
                  sortOrder === 'unread' ? "bg-primary/10 text-primary border-primary/20" : "bg-white text-slate-400 border-slate-100"
                )}
              >
                <SortDesc className="w-3.5 h-3.5" />
                {sortOrder === 'unread' ? 'Não Lidas 1º' : 'Recentes 1º'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar pb-32">
        {filteredAndSortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-slate-200" />
            </div>
            <p className="text-xl font-black text-secondary">Nenhuma conversa encontrada</p>
            <p className="text-sm font-bold text-slate-400 mt-2">Tente mudar os filtros ou a sua pesquisa.</p>
          </div>
        ) : (
          filteredAndSortedChats.map((chat) => (
            <div key={chat.id} className="relative group">
              <button 
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full p-6 flex items-center gap-5 rounded-[32px] transition-all active:scale-[0.98] border-2 text-left relative z-0",
                  chat.unread 
                    ? "bg-primary/5 border-primary/20 shadow-md" 
                    : "bg-white border-slate-50 hover:border-slate-100 hover:bg-slate-50"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-200/60 shadow-sm font-bold text-xl text-slate-500 shrink-0 uppercase">
                    {chat.userName[0]}
                  </div>
                  {chat.unread && <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary border-4 border-white rounded-full" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-secondary truncate">{chat.userName}</h3>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        (currentUser && chat.buyerId === currentUser.id) 
                          ? "bg-blue-50 text-blue-500 border-blue-100" 
                          : "bg-green-50 text-green-500 border-green-100"
                      )}>
                        {(currentUser && chat.buyerId === currentUser.id) ? 'Comprar' : 'Vender'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                      {new Date(chat.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm truncate mb-3 leading-none", 
                    chat.unread ? "font-black text-primary" : "font-bold text-slate-500"
                  )}>
                    {chat.messages[chat.messages.length - 1]?.text}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={chat.listingPreview} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate">
                      {chat.listingTitle}
                    </span>
                  </div>
                </div>
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(chat.id);
                }}
                className="absolute top-1/2 -translate-y-1/2 -right-2 w-12 h-12 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all flex items-center justify-center shadow-xl shadow-red-500/20 active:scale-90 z-10"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-secondary mb-4 italic">Eliminar Conversa?</h3>
              <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                Tem a certeza que deseja apagar este chat? Esta ação não pode ser desfeita e perderá todo o histórico.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="h-14 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onDeleteChat(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }}
                  className="h-14 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Sim, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
