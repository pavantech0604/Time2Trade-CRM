import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, UserRole } from '../../types';
import { formatINR } from '../../lib/calculations';
import {
  MessageSquare,
  Send,
  Sparkles,
  Users,
  Search,
  Check,
  CheckCheck,
  Smile,
  Flame,
  ThumbsUp,
  Heart,
  TrendingUp,
  PartyPopper,
  ShieldCheck,
  CreditCard,
  Building2,
  Phone,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
  Hash,
  X,
  Volume2,
} from 'lucide-react';

interface TeamChatProps {
  initialChannelId?: string;
  onOpenPaymentForm?: () => void;
}

const CHANNEL_CONFIG = {
  'sales-celebrations': {
    name: 'Sales Celebrations',
    icon: PartyPopper,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    description: 'Automatic sales wins, congratulations, and profit share celebrations',
  },
  'payment-queries': {
    name: 'Payment Queries & UTR',
    icon: CreditCard,
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    description: 'Bank verification questions, UTR checks, and receipt clearances',
  },
  'general-desk': {
    name: 'General Desk & Shifts',
    icon: MessageSquare,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    description: 'Daily operational handovers, team chatter, and general announcements',
  },
};

const QUICK_REACTION_EMOJIS = ['🎉', '👏', '🔥', '🚀', '💰', '❤️', '👍'];

const QUICK_REPLY_TEMPLATES = [
  '🎉 Huge congratulations on the big close! 🚀',
  '⚡ Payment proof submitted for review. Please verify UTR.',
  '🤝 Shared commission split confirmed. Thank you!',
  '✅ Verified and matched in bank statement.',
  '👏 Great work team, let’s keep the streak alive!',
];

export const TeamChat: React.FC<TeamChatProps> = ({ initialChannelId = 'sales-celebrations', onOpenPaymentForm }) => {
  const { currentUser, users, chatMessages, sendMessage, addMessageReaction, payments } = useAuth();

  const [activeChannel, setActiveChannel] = useState<string>(initialChannelId);
  const [activeDirectUser, setActiveDirectUser] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // message id for emoji bar
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change or channel switches
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeChannel, activeDirectUser]);

  // Trigger brief celebration animation when opening celebrations with recent verified sales
  useEffect(() => {
    if (activeChannel === 'sales-celebrations') {
      setIsConfettiActive(true);
      const t = setTimeout(() => setIsConfettiActive(false), 3000);
      return () => clearTimeout(t);
    }
  }, [activeChannel]);

  if (!currentUser) return null;

  // Filter messages for current channel or direct chat
  const currentMessages = useMemo(() => {
    return chatMessages.filter((msg) => {
      if (activeDirectUser) {
        // Direct messages between currentUser and activeDirectUser
        return (
          (msg.sender_id === currentUser.id && msg.recipient_id === activeDirectUser) ||
          (msg.sender_id === activeDirectUser && msg.recipient_id === currentUser.id)
        );
      }
      // Channel messages
      return !msg.recipient_id && msg.channel_id === activeChannel;
    });
  }, [chatMessages, activeChannel, activeDirectUser, currentUser.id]);

  // Search filtered messages
  const displayedMessages = useMemo(() => {
    if (!searchQuery.trim()) return currentMessages;
    const q = searchQuery.toLowerCase().trim();
    return currentMessages.filter(
      (m) =>
        m.message.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        m.payment_meta?.client_name?.toLowerCase().includes(q) ||
        m.payment_meta?.utr?.toLowerCase().includes(q)
    );
  }, [currentMessages, searchQuery]);

  // List of other users for 1-on-1 direct messaging
  const teamMembers = useMemo(() => {
    return users.filter((u) => u.id !== currentUser.id && (u.role === 'employee' || u.role === 'admin'));
  }, [users, currentUser.id]);

  // Count unread or channel count
  const getChannelMessageCount = (chId: string) => {
    return chatMessages.filter((m) => !m.recipient_id && m.channel_id === chId).length;
  };

  const getDirectMessageCount = (targetUserId: string) => {
    return chatMessages.filter(
      (m) =>
        (m.sender_id === targetUserId && m.recipient_id === currentUser.id) ||
        (m.sender_id === currentUser.id && m.recipient_id === targetUserId)
    ).length;
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    sendMessage({
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      channel_id: activeDirectUser ? 'direct' : activeChannel,
      recipient_id: activeDirectUser || undefined,
      message: text,
      message_type: 'text',
    });

    setInputText('');
  };

  const handleSendTemplate = (template: string) => {
    sendMessage({
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      channel_id: activeDirectUser ? 'direct' : activeChannel,
      recipient_id: activeDirectUser || undefined,
      message: template,
      message_type: template.includes('🎉') ? 'celebration' : 'text',
    });
  };

  const formatMessageTime = (timeStr: string) => {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatMessageDateGroup = (timeStr: string) => {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const activeDirectUserObj = activeDirectUser ? users.find((u) => u.id === activeDirectUser) : null;
  const currentChannelConfig = (CHANNEL_CONFIG as any)[activeChannel] || CHANNEL_CONFIG['general-desk'];
  const ChannelIcon = currentChannelConfig.icon;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[620px] font-sans relative">
      {/* Confetti Visual Burst on celebration channel */}
      {isConfettiActive && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-emerald-400 animate-pulse z-30" />
      )}

      {/* LEFT SIDEBAR: CHANNELS & DIRECT MESSAGES (WhatsApp styled) */}
      <div className="w-full md:w-80 lg:w-88 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-600/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Team Desk Chat</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">In-app communication hub</p>
            </div>
          </div>

          {onOpenPaymentForm && (
            <button
              type="button"
              onClick={onOpenPaymentForm}
              className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 text-xs font-bold cursor-pointer"
              title="Submit Payment Proof"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Global Search across chats */}
        <div className="p-3 border-b border-slate-200/60 bg-white/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat or client..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channel & Direct Messages Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {/* Section: Channels */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Team Channels
            </div>
            <div className="space-y-1 mt-1">
              {Object.entries(CHANNEL_CONFIG).map(([chKey, config]) => {
                const Icon = config.icon;
                const isActive = !activeDirectUser && activeChannel === chKey;
                const count = getChannelMessageCount(chKey);

                return (
                  <button
                    key={chKey}
                    type="button"
                    onClick={() => {
                      setActiveDirectUser(null);
                      setActiveChannel(chKey);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-900 font-bold border border-emerald-300/80 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-xs font-black truncate">{config.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{config.description}</p>
                      </div>
                    </div>
                    {count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 shrink-0 ml-1">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Direct Messages (Colleagues & Admin) */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Direct Messages</span>
              <span className="text-[9px] font-normal text-slate-400">({teamMembers.length})</span>
            </div>
            <div className="space-y-1 mt-1">
              {teamMembers.map((member) => {
                const isActive = activeDirectUser === member.id;
                const msgCount = getDirectMessageCount(member.id);
                const isAdmin = member.role === 'admin';

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setActiveDirectUser(member.id)}
                    className={`w-full text-left px-3 py-2 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-900 font-bold border border-emerald-300/80 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{member.name}</span>
                          {isAdmin && (
                            <span className="px-1 py-0.1 rounded text-[8px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {member.designation || (isAdmin ? 'Admin' : 'Sales Executive')}
                        </span>
                      </div>
                    </div>
                    {msgCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 shrink-0">
                        {msgCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT MAIN CHAT AREA (WhatsApp Aesthetic) */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2] min-w-0 relative">
        {/* Subtle WhatsApp-style doodle / geometry wallpaper background overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#000 1.2px, transparent 1.2px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Chat Active Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm flex items-center justify-between relative z-10 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {activeDirectUserObj ? (
              <>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {activeDirectUserObj.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 truncate">{activeDirectUserObj.name}</h3>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase">
                      Direct Chat
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeDirectUserObj.designation || activeDirectUserObj.email}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${currentChannelConfig.color} shadow-sm`}>
                  <ChannelIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-black text-slate-900 truncate">{currentChannelConfig.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{currentChannelConfig.description}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold">
              <Users className="w-3 h-3" />
              <span>{users.length} Active Staff</span>
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10">
          {displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-sm">
                <MessageSquare className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="max-w-xs">
                <p className="text-xs font-black text-slate-800">No messages in this chat yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Start the conversation or celebrate a payment below without switching to WhatsApp!
                </p>
              </div>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const isCelebration = msg.message_type === 'celebration';
              const showDatePill =
                idx === 0 ||
                formatMessageDateGroup(msg.created_at) !== formatMessageDateGroup(displayedMessages[idx - 1].created_at);

              return (
                <React.Fragment key={msg.id}>
                  {/* Date Separator Pill */}
                  {showDatePill && (
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[10px] font-bold text-slate-500 shadow-2xs">
                        {formatMessageDateGroup(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                    {/* Celebration Card Message */}
                    {isCelebration ? (
                      <div className="max-w-md w-full my-1 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-50/60 border-2 border-amber-300 shadow-lg p-4 space-y-3 relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                        
                        {/* Header with Trophy & Badges */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                              <PartyPopper className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-amber-950 uppercase tracking-tight block">
                                Verified Sale Celebration 🎉
                              </span>
                              <span className="text-[10px] text-amber-700 font-medium">Broadcasted to all desks</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                            APPROVED
                          </span>
                        </div>

                        {/* Celebration Body */}
                        <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                          {msg.message}
                        </p>

                        {/* Payment Details Strip if metadata present */}
                        {msg.payment_meta && (
                          <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/80 text-xs space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Client Name:</span>
                              <span className="font-extrabold text-slate-900">{msg.payment_meta.client_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Total Amount:</span>
                              <span className="font-black text-emerald-700 text-sm">
                                {formatINR(msg.payment_meta.amount || 0)}
                              </span>
                            </div>
                            {msg.payment_meta.utr && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Bank UTR:</span>
                                <span className="font-mono text-slate-600 font-bold">{msg.payment_meta.utr}</span>
                              </div>
                            )}

                            {/* Multi-Employee Split Allocation Tag List */}
                            {msg.payment_meta.allocations && msg.payment_meta.allocations.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                  Credited Staff Splits:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.payment_meta.allocations.map((a, aIdx) => (
                                    <span
                                      key={aIdx}
                                      className="px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-300/80 text-[10px] font-mono font-bold text-amber-950"
                                    >
                                      {a.employee_name}: ₹{Number(a.amount).toLocaleString('en-IN')} ({a.percentage}%)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive Reaction Buttons & Timestamp */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {QUICK_REACTION_EMOJIS.slice(0, 5).map((emoji) => {
                              const reactionCount = msg.reactions?.[emoji]?.length || 0;
                              const hasReacted = msg.reactions?.[emoji]?.includes(currentUser.id);

                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => addMessageReaction(msg.id, emoji)}
                                  className={`px-2 py-1 rounded-xl text-xs flex items-center gap-1 border transition-all cursor-pointer active:scale-90 ${
                                    hasReacted
                                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                                      : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700'
                                  }`}
                                  title={`React with ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  {reactionCount > 0 && <span>{reactionCount}</span>}
                                </button>
                              );
                            })}
                          </div>
                          <span className="font-mono text-slate-400">{formatMessageTime(msg.created_at)}</span>
                        </div>
                      </div>
                    ) : (
                      /* Standard WhatsApp-Style Chat Bubble */
                      <div className="relative max-w-sm sm:max-w-md">
                        <div
                          className={`p-3 rounded-2xl text-xs space-y-1 shadow-2xs relative ${
                            isMe
                              ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs border border-[#C5E1A5]'
                              : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200'
                          }`}
                        >
                          {/* Sender Name in non-self messages */}
                          {!isMe && (
                            <span className="font-black text-[11px] text-emerald-800 block">
                              {msg.sender_name}
                              {msg.sender_role === 'admin' && (
                                <span className="ml-1.5 px-1 py-0.2 rounded text-[8px] bg-blue-100 text-blue-800 uppercase font-extrabold">
                                  Admin
                                </span>
                              )}
                            </span>
                          )}

                          {/* Message Text */}
                          <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.message}</p>

                          {/* Message Meta: Time and Read Tick */}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-0.5">
                            <span className="font-mono">{formatMessageTime(msg.created_at)}</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />}
                          </div>

                          {/* Existing Emoji Reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex items-center gap-1 pt-1 flex-wrap">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                const count = userIds.length;
                                if (count === 0) return null;
                                const hasReacted = userIds.includes(currentUser.id);

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => addMessageReaction(msg.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 border cursor-pointer ${
                                      hasReacted
                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                                        : 'bg-white/80 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Hover Quick Emoji Reaction Picker */}
                        <div
                          className={`absolute top-0 ${
                            isMe ? '-left-24' : '-right-24'
                          } hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded-full p-1 shadow-md z-20`}
                        >
                          {QUICK_REACTION_EMOJIS.slice(0, 4).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => addMessageReaction(msg.id, emoji)}
                              className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-xs cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM ACTION & INPUT AREA */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5 relative z-20">
          {/* WhatsApp Style Quick Template Chips (Eliminates typing repetitive messages) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 font-mono">
              Quick:
            </span>
            {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendTemplate(tmpl)}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 text-slate-600 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border border-slate-200/80 shrink-0 shadow-2xs active:scale-95"
              >
                {tmpl}
              </button>
            ))}
          </div>

          {/* Main WhatsApp Message Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center bg-slate-100 border border-slate-200 rounded-2xl focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeDirectUserObj
                    ? `Message ${activeDirectUserObj.name}...`
                    : `Message #${currentChannelConfig.name}...`
                }
                className="w-full px-4 py-3 bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-11 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
