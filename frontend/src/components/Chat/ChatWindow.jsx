import React, { useState, useEffect, useRef } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Send, Users, Compass, Smile } from 'lucide-react';

const ChatWindow = () => {
  const { user } = useAuth();
  const { activeTrip, messages, sendMessage, setTyping, typingRiders, onlineRiders } = useActiveTrip();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(content.trim());
    setContent('');

    // Clear typing status
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e) => {
    setContent(e.target.value);

    // Typing notification handler
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  // Convert dictionary coordinates of active typing riders to string list
  const activeTypists = Object.entries(typingRiders)
    .filter(([username, isTyping]) => isTyping && username !== user?.username)
    .map(([username]) => username);

  if (!activeTrip) return null;

  return (
    <div className="flex flex-col h-[520px] rounded-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden">
      {/* 1. Header Presence tags */}
      <div className="p-4 bg-darkCard border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
            Group Chat Logs
          </h3>
          <p className="text-gray-400 text-[10px] mt-0.5">Secure session channel for this ride</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-brandCyan font-semibold px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20">
          <Users size={12} />
          <span>{onlineRiders.length} Online Present</span>
        </div>
      </div>

      {/* 2. Message History scrollable view */}
      <div className="grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
            <Compass size={24} className="text-slate-600 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider">No communications received. Send a message to start!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender._id === user?.id;
            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[9px] text-gray-400 font-bold mb-0.5 px-1 uppercase tracking-wider">
                  {isMe ? 'Me' : msg.sender.username}
                </span>
                <div
                  className={`p-3 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white rounded-tr-none shadow-md shadow-cyan-500/5'
                      : 'bg-white/5 text-gray-300 border border-white/5 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[8px] text-gray-500 font-semibold mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Typing statuses */}
      {activeTypists.length > 0 && (
        <div className="px-4 py-1.5 text-[10px] text-brandCyan bg-cyan-500/5 border-t border-white/5 italic font-bold">
          {activeTypists.join(', ')} {activeTypists.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* 4. Submission bar */}
      <form onSubmit={handleSend} className="p-3 bg-darkCard border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={handleInputChange}
          placeholder="Compose group coordinate ping..."
          className="grow px-4 py-2.5 rounded-xl glass-input text-xs"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-2.5 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-40 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
