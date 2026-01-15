import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const JournalPage: React.FC = () => {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const { logs, updateLogNote } = useApp();
  const [note, setNote] = useState('');

  useEffect(() => {
    const log = logs.find(l => l.id === logId);
    if (log && log.note) {
      setNote(log.note);
    }
  }, [logId, logs]);

  const handleSave = async () => {
    if (logId) {
      await updateLogNote(logId, note);
    }
    navigate(-1);
  };

  return (
    <div className="bg-[#F5F5F7] text-gray-900 font-sans antialiased min-h-screen">
      <main className="max-w-md mx-auto w-full min-h-screen flex flex-col relative pb-safe">
        <header className="flex justify-between items-center px-6 pt-8 pb-4">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:bg-gray-200 transition-colors">
            <i className="fa-solid fa-arrow-left text-xl text-black"></i>
          </button>
          <h1 className="text-[18px] font-bold text-black tracking-wide">习惯记录</h1>
          <div className="w-10 h-10"></div>
        </header>

        <section className="flex-1 px-5 py-4 flex items-center justify-center mb-8">
          <div className="w-full bg-white rounded-[24px] shadow-sm p-6 relative flex flex-col" style={{ height: '60vh' }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-full border-none p-0 text-[17px] text-gray-800 placeholder-gray-400 resize-none bg-transparent leading-relaxed focus:ring-0 focus:outline-none"
              placeholder="写点什么记录一下吧..."
            ></textarea>
          </div>
        </section>

        <div className="px-6 pb-12 pt-2">
          <button
            onClick={handleSave}
            className="w-full bg-black text-white text-[17px] font-bold py-4 rounded-full shadow-lg active:scale-[0.98] transition-all flex items-center justify-center hover:bg-gray-900"
          >
            保存
          </button>
        </div>
      </main>
    </div>
  );
};

export default JournalPage;