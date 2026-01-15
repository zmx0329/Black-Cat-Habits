import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { IMAGES } from '../constants';

const ChatPage: React.FC = () => {
  const { messages, sendMessage } = useApp();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col">
      <header className="flex-none bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="h-6"></div> {/* Status Bar Spacer */}
        <nav className="h-14 flex items-center justify-between px-4">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
          <h1 className="text-lg font-bold">黑主任对话</h1>
          <button aria-label="Menu" className="p-2 -mr-2 text-black hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-white pb-24">
        {messages.map((msg) => (
            <article key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                    <div className="flex-shrink-0">
                        <img alt="AI Avatar" className="w-10 h-10 object-contain rounded-full mix-blend-multiply" src={IMAGES.CAT_AVATAR} />
                    </div>
                )}
                
                <div className={`p-4 rounded-2xl max-w-[80%] leading-normal text-base ${
                    msg.sender === 'ai' 
                    ? 'text-black bg-[#f0f0f0] rounded-bl-sm' 
                    : 'text-white bg-[#3a3f4b] rounded-br-sm text-left'
                }`}>
                    <p>{msg.text}</p>
                </div>

                {msg.sender === 'user' && (
                    <div className="flex-shrink-0">
                        <img alt="User Avatar" className="w-10 h-10 rounded-full object-cover" src={IMAGES.USER_AVATAR} />
                    </div>
                )}
            </article>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-6 z-40">
        <form className="flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          {/* Voice Input Button */}
          <button aria-label="Voice input" className="text-gray-500 hover:text-black transition-colors p-1" type="button">
             <i className="fas fa-microphone text-xl"></i>
          </button>
          
          <div className="flex-1 relative">
            <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2.5 px-4 focus:outline-none focus:border-gray-400 focus:ring-0 text-gray-800 placeholder-gray-400 shadow-sm" 
                placeholder="说点什么..." 
                type="text" 
            />
          </div>
          <button aria-label="Add attachment" className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
          <button className="hover:bg-black text-white px-5 py-2.5 rounded-full font-medium transition-colors shadow-sm bg-[#3a3f4b]" type="submit">
            发送
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatPage;