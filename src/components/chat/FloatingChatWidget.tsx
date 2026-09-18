import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage } from '../../types';
import { formatINR } from '../../lib/calculations';
import {
  MessageSquare,
  Send,
  X,
  Maximize2,
  PartyPopper,
  CreditCard,
  Hash,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

interface FloatingChatWidgetProps {
  onOpenFullChat: () => void;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({ onOpenFullChat }) => {
  const { currentUser, chatMessages, sendMessage, addMessageReaction } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'sales-celebrations' | 'payment-queries' | 'general-desk'>('sales-celebrations');
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages for the current widget channel
  const currentMessages = useMemo(() => {
    return chatMessages.filter((msg) => msg.channel_id === activeChannel);
  }, [chatMessages, activeChannel]);

  // Track unread messages when widget is closed
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLastReadTimestamp(Date.now());
    } else {
      const newMsgs = chatMessages.filter(
        (m) => new Date(m.created_at).getTime() > lastReadTimestamp && m.sender_id !== currentUser?.id
      );
      setUnreadCount(newMsgs.length);
    }
  }, [chatMessages, isOpen, lastReadTimestamp, currentUser?.id]);

  // Scroll to bottom on new messages if open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length, isOpen]);

  if (!currentUser) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    sendMessage({
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      channel_id: activeChannel,
      message_type: 'text',
      message: trimmed,
    });
    setInputText('');
  };

  const channels = [
    { id: 'sales-celebrations' as const, label: 'Sales Wins', icon: PartyPopper, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'payment-queries' as const, label: 'UTR Queries', icon: CreditCard, badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'general-desk' as const, label: 'General Desk', icon: Hash, badgeColor: 'bg-slate-100 text-slate-800' },
  ];

  const quickReplies = [
    '🎉 Congratulations on the sale!',
    '💰 Payment verified & confirmed',
    '🔍 Checking UTR right now',
    '👍 Noted team',
  ];

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 font-sans">
      {/* Expanded Popup Window (Time2Trade CRM Theme) */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
          {/* Header - Time2Trade Luxury Navy & Gold Theme */}
          <div className="bg-gradient-to-r from-[#091A2F] via-[#112744] to-[#091A2F] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#C5A028]/30 shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C5A028]/30 to-[#E6C34E]/20 border border-[#C5A028]/40 flex items-center justify-center text-[#F3E29F] shadow-sm">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black tracking-wide text-white">Time2Trade Team Chat</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-300 font-medium">Active Desk • Staff & Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullChat();
                }}
                className="p-1.5 rounded-xl text-slate-300 hover:text-[#C5A028] hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand to Full Chat View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {/* Single Clean Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-2.5 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#091A2F] text-white shadow-xs border border-[#091A2F]'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C5A028]' : 'text-slate-400'}`} />
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-2xs">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No messages in #{activeChannel}</p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">Send a quick update, query a UTR, or celebrate a sale!</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;
                const isCelebration = msg.message_type === 'celebration' || msg.message_type === 'payment_verified';

                if (isCelebration) {
                  return (
                    <div
                      key={msg.id}
                      className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/15 border-2 border-[#C5A028]/60 rounded-2xl p-3 shadow-xs text-center my-1 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-1.5 text-amber-800 text-xs font-black">
                        <PartyPopper className="w-3.5 h-3.5 text-amber-600" />
                        <span>SALE CELEBRATION!</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1 whitespace-pre-line">
                        {msg.message}
                      </p>
                      {msg.payment_meta && (
                        <div className="mt-2 inline-block bg-white/95 border border-[#C5A028]/60 rounded-xl px-2.5 py-0.5 text-[11px] font-black text-amber-900 shadow-2xs font-mono">
                          Verified: {formatINR(msg.payment_meta.amount || 0)}
                        </div>
                      )}
                      {/* Emoji reaction bar */}
                      <div className="flex items-center justify-center gap-1.5 mt-2.5">
                        {['🎉', '👏', '🔥', '💰', '❤️'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addMessageReaction(msg.id, emoji)}
                            className="text-xs p-1 rounded-lg bg-white hover:bg-amber-50 hover:scale-110 shadow-2xs border border-amber-200 transition-all cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <span className="text-[10px] font-bold text-slate-500 ml-1 mb-0.5">
                        {msg.sender_name} <span className="font-normal text-slate-400 capitalize">({msg.sender_role})</span>
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs relative ${
                        isMe
                          ? 'bg-[#091A2F] text-white rounded-tr-none border border-[#122A4A]'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-[#C5A028]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div className="px-2.5 py-1.5 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  sendMessage({
                    sender_id: currentUser.id,
                    sender_name: currentUser.name,
                    sender_role: currentUser.role,
                    channel_id: activeChannel,
                    message_type: 'text',
                    message: reply,
                  });
                }}
                className="px-2.5 py-1 bg-white border border-slate-200/90 rounded-full text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#091A2F] hover:text-[#091A2F] whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${activeChannel}...`}
              className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091A2F] focus:bg-white transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-[#091A2F] hover:bg-[#122A4A] disabled:opacity-40 text-[#C5A028] transition-all cursor-pointer shadow-sm shrink-0 font-bold"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Circular Action Button (Only visible when chat is closed, eliminating double close button) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Time2Trade Team Chat"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200 cursor-pointer relative group bg-gradient-to-tr from-[#091A2F] via-[#102A4C] to-[#0A223E] border border-[#C5A028]/50 hover:scale-105 active:scale-95 shadow-slate-900/30"
        >
          <MessageSquare className="w-6 h-6 text-[#F3E29F] group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#C5A028] text-[#091A2F] text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-md animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Subtle Brand Pulse Ring */}
          <span className="absolute inset-0 rounded-full bg-[#C5A028]/25 group-hover:bg-[#C5A028]/35 animate-ping pointer-events-none" />
        </button>
      )}
    </div>
  );
};
