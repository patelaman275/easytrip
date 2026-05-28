import React, { useState, useEffect, useRef } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Send, Users, Compass } from 'lucide-react';

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

    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e) => {
    setContent(e.target.value);

    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const activeTypists = Object.entries(typingRiders)
    .filter(([username, isTyping]) => isTyping && username !== user?.username)
    .map(([username]) => username);

  if (!activeTrip) return null;

  return (
    <div className="flex flex-col h-[520px] rounded glass-panel border border-[#242424] shadow-2xl overflow-hidden font-sans">
      {/* 1. Header Presence tags */}
      <div className="p-4 bg-darkCard border-b border-[#242424] flex items-center justify-between">
        <div>
          <h3 className="text-white font-black text-xs uppercase tracking-wider">
            Group Chat
          </h3>
          <p className="text-neutral-400 text-[10px] font-medium mt-0.5">Secure session channel for this ride</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-brandOrange font-black bg-brandOrange/10 border border-brandOrange/25 px-2 py-0.5 rounded uppercase tracking-wider">
          <Users size={10} />
          <span>{onlineRiders.length} Online</span>
        </div>
      </div>

      {/* 2. Message History scrollable view */}
      <div className="grow overflow-y-auto p-4 space-y-4 bg-darkBg/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 select-none">
            <Compass size={20} className="text-neutral-700" />
            <span className="text-[10px] font-bold uppercase tracking-wider">No pings received yet</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender._id === user?.id;
            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[8px] text-neutral-500 font-black mb-0.5 px-1 uppercase tracking-wider">
                  {isMe ? 'Me' : msg.sender.username}
                </span>
                <div
                  className={`p-2.5 rounded text-xs ${
                    isMe
                      ? 'bg-brandOrange text-white rounded-tr-none font-medium'
                      : 'bg-[#1c1c1e] text-neutral-200 border border-[#2c2c2e] rounded-tl-none font-medium'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[8px] text-neutral-600 font-bold mt-1 px-1">
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
        <div className="px-4 py-1 bg-brandOrange/5 border-t border-[#242424] text-[9px] text-brandOrange font-bold uppercase italic">
          {activeTypists.join(', ')} typing...
        </div>
      )}

      {/* 4. Submission bar */}
      <form onSubmit={handleSend} className="p-3 bg-darkCard border-t border-[#242424] flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={handleInputChange}
          placeholder="SEND GROUP MESSAGE..."
          className="grow px-3 py-2 rounded glass-input text-xs"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-2 bg-brandOrange hover:bg-[#e25700] disabled:opacity-40 text-white rounded transition-all shadow flex items-center justify-center shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
