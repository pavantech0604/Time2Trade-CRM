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
  Sparkles,
  CheckCheck,
  ArrowDown,
  Shield,
  Briefcase,
  User,
} from 'lucide-react';

interface FloatingChatWidgetProps {
  onOpenFullChat: () => void;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({ onOpenFullChat }) => {
  const { currentUser, chatMessages, sendMessage, addMessageReaction } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const lastReadTimestampRef = useRef<number>(Date.now());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const prevMessagesCountRef = useRef(chatMessages.length);

  // Keep read timestamp updated when chat is open
  if (isOpen) {
    lastReadTimestampRef.current = Date.now();
  }

  // Unread badge count
  const unreadCount = useMemo(() => {
    if (isOpen) return 0;
    return chatMessages.filter(
      (m) => new Date(m.created_at).getTime() > lastReadTimestampRef.current && m.sender_id !== currentUser?.id
    ).length;
  }, [chatMessages, isOpen, currentUser?.id]);

  // Unified chronological messages
  const sortedMessages = useMemo(() => {
    return [...chatMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [chatMessages]);

  // Detect when user scrolls up
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 60;
    userScrolledUpRef.current = isUp;
    setShowScrollBottom(isUp);
  };

  // Smooth scroll to bottom
  const scrollToBottom = (smooth = true) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
  };

  // Scroll to bottom when first opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-scroll on new message only if near bottom or sent by me
  useEffect(() => {
    if (!isOpen) return;
    const isNew = sortedMessages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = sortedMessages.length;

    if (isNew) {
      const latest = sortedMessages[sortedMessages.length - 1];
      const sentByMe = latest && latest.sender_id === currentUser?.id;

      if (sentByMe || !userScrolledUpRef.current) {
        scrollToBottom(true);
      }
    }
  }, [sortedMessages.length, isOpen, currentUser?.id]);

  if (!currentUser) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    sendMessage({
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      channel_id: 'general-desk',
      message_type: 'text',
      message: trimmed,
    });
    setInputText('');
    userScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(true), 50);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5 text-blue-600" /> Admin
          </span>
        );
      case 'manager':
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
            <Briefcase className="w-2.5 h-2.5 text-purple-600" /> Manager
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
            <User className="w-2.5 h-2.5 text-slate-500" /> Staff
          </span>
        );
    }
  };

  return (
    <div className="fixed bottom-20 right-3 sm:right-6 md:bottom-6 z-50 font-sans max-w-[calc(100vw-24px)]">
      {/* Expanded Popup Window */}
      {isOpen && (
        <div className="w-[calc(100vw-24px)] sm:w-[390px] max-w-[420px] h-[520px] max-h-[calc(100dvh-100px)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 ring-1 ring-black/5">
          {/* Header - Clean Time2Trade White with Slate & Blue Accents */}
          <div className="bg-white px-4 py-3.5 flex items-center justify-between border-b border-slate-200/90 shadow-2xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Time2Trade Team Chat</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Direct team communication</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullChat();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Expand to Full Chat View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container with Full Smooth Scrollability */}
          <div className="relative flex-1 min-h-0 bg-slate-50/70 flex flex-col">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {sortedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No messages yet</h4>
                  <p className="text-[11px] text-slate-400 max-w-[220px] leading-relaxed">
                    Send a message below to communicate directly with your team!
                  </p>
                </div>
              ) : (
                sortedMessages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  const isCelebration = msg.message_type === 'celebration' || msg.message_type === 'payment_verified';

                  // Sales Celebration Card
                  if (isCelebration) {
                    return (
                      <div
                        key={msg.id}
                        className="bg-gradient-to-br from-amber-50 via-white to-amber-50/80 border border-amber-300 rounded-2xl p-3 shadow-2xs text-center my-1.5 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-center gap-1.5 text-amber-900 text-xs font-bold">
                          <PartyPopper className="w-4 h-4 text-amber-600" />
                          <span>SALES WIN CELEBRATION!</span>
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-1 whitespace-pre-line leading-relaxed">
                          {msg.message}
                        </p>
                        {msg.payment_meta && (
                          <div className="mt-2 inline-block bg-white border border-amber-300 rounded-xl px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs font-mono">
                            Verified: {formatINR(msg.payment_meta.amount || 0)}
                          </div>
                        )}
                        {/* Reaction buttons */}
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          {['🎉', '👏', '🔥', '💰', '❤️'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => addMessageReaction(msg.id, emoji)}
                              className="text-xs p-1 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 transition-all cursor-pointer shadow-2xs"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Standard Chat Message Bubble (WhatsApp/Time2Trade style)
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {!isMe && (
                        <div className="flex items-center gap-1.5 ml-1 mb-1">
                          <span className="text-[11px] font-bold text-slate-800">
                            {msg.sender_name}
                          </span>
                          {getRoleBadge(msg.sender_role)}
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs relative ${
                          isMe
                            ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs border border-[#C5E1A5]'
                            : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 font-mono">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Floating Jump to Latest Button when Scrolled Up */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 active:scale-95 transition-all z-10"
              >
                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Jump to latest</span>
              </button>
            )}
          </div>

          {/* Clean Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-slate-200/90 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message to team..."
              className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-sm shadow-blue-500/20 shrink-0 font-bold active:scale-95"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Circular Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Time2Trade Team Chat"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/25 transition-all duration-200 cursor-pointer relative group bg-gradient-to-tr from-blue-600 to-indigo-600 hover:scale-105 active:scale-95 border-2 border-white"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center shadow-md animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

