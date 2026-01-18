import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { HabitType } from '../types';
import { IMAGES } from '../constants';
import { fetchHabitDetailRemark } from '../services/deepseek';

const HabitDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, logs, addLog, deleteLog, deleteHabit } = useApp();
  const habit = habits.find(h => h.id === id);
  const habitLogs = useMemo(() => {
    return logs
      .filter(l => l.habit_id === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, id]);

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [detailRemark, setDetailRemark] = useState('');
  const [detailRemarkLoading, setDetailRemarkLoading] = useState(false);
  const detailSignatureRef = useRef<string>('');
  const detailStreamRef = useRef('');
  const detailDisplayRef = useRef('');
  const detailDoneRef = useRef(false);
  const detailTimerRef = useRef<number | null>(null);

  if (!habit) return <div>Habit not found</div>;

  const handleLogClick = (logId: string) => {
    setSelectedLogId(logId);
  };

  const handleEditHabit = () => {
    navigate(`/edit/${habit.id}`);
  };

  const handleDeleteHabit = async () => {
    const confirmed = window.confirm('确定要删除这个习惯吗？所有相关记录也会被删除。');
    if (!confirmed) return;
    await deleteHabit(habit.id);
    navigate('/');
  };

  // Fix: Explicitly navigate to home to avoid history loop
  const handleBack = () => {
    navigate('/');
  };

  const handleCheckIn = async () => {
    if (!habit) return;
    await addLog(habit.id);
  };

  const selectedLog = logs.find(l => l.id === selectedLogId);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth();

    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `今天 ${timeStr}`;
    if (isYesterday) return `昨天 ${timeStr}`;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
  };

  const startTypewriter = (
    streamRef: React.MutableRefObject<string>,
    displayRef: React.MutableRefObject<string>,
    doneRef: React.MutableRefObject<boolean>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    timerRef: React.MutableRefObject<number | null>
  ) => {
    if (timerRef.current !== null) return;
    timerRef.current = window.setInterval(() => {
      if (displayRef.current.length < streamRef.current.length) {
        const nextChar = streamRef.current.charAt(displayRef.current.length);
        displayRef.current += nextChar;
        setText(displayRef.current);
        return;
      }
      if (doneRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 30);
  };

  const resetTypewriter = (
    streamRef: React.MutableRefObject<string>,
    displayRef: React.MutableRefObject<string>,
    doneRef: React.MutableRefObject<boolean>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    timerRef: React.MutableRefObject<number | null>
  ) => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current = '';
    displayRef.current = '';
    doneRef.current = false;
    setText('');
  };

  useEffect(() => {
    if (!habit) return;

    const signature = `${habit.id}-${habitLogs.length}-${habitLogs[0]?.timestamp || ''}`;
    if (detailSignatureRef.current === signature && !detailRemarkLoading) return;
    detailSignatureRef.current = signature;

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const completedLogs = habitLogs.filter(l => l.status === 'completed');
    const weekLogs = completedLogs.filter(l => new Date(l.timestamp) >= weekStart);
    const weekDoneDays = new Set(
      weekLogs.map(l => {
        const d = new Date(l.timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ).size;

    const activeDays = new Set(
      completedLogs.map(l => {
        const d = new Date(l.timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ).size;

    const firstLog = completedLogs[completedLogs.length - 1];
    const daysSinceStart = firstLog
      ? Math.max(1, Math.ceil((now.getTime() - new Date(firstLog.timestamp).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const lastCheckin = completedLogs[0]?.timestamp
      ? formatDate(completedLogs[0].timestamp)
      : '暂无';

    resetTypewriter(detailStreamRef, detailDisplayRef, detailDoneRef, setDetailRemark, detailTimerRef);
    setDetailRemarkLoading(true);

    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('habit detail remark timeout')), 8000)
    );

    Promise.race([
      fetchHabitDetailRemark({
        habit,
        weekCount: weekLogs.length,
        weekDoneDays,
        totalCount: completedLogs.length,
        activeDays,
        daysSinceStart,
        lastCheckin
      }, (text) => {
        detailStreamRef.current = text;
        startTypewriter(detailStreamRef, detailDisplayRef, detailDoneRef, setDetailRemark, detailTimerRef);
      }),
      timeout
    ])
      .then(text => {
        detailStreamRef.current = text;
        detailDoneRef.current = true;
        startTypewriter(detailStreamRef, detailDisplayRef, detailDoneRef, setDetailRemark, detailTimerRef);
        setDetailRemarkLoading(false);
      })
      .catch(err => {
        console.warn('Habit detail remark failed:', err);
        detailStreamRef.current = '';
        detailDoneRef.current = true;
        setDetailRemarkLoading(false);
      });
  }, [habit, habitLogs]);

  useEffect(() => {
    return () => {
      if (detailTimerRef.current !== null) clearInterval(detailTimerRef.current);
    };
  }, []);

  // Heatmap Logic: Last 6 months
  const renderHeatmap = () => {
    const today = new Date();
    const months = [];

    // Generate last 6 months data
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.getMonth() + 1 + '月';
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

      const columns = [];
      // Logic: 3 columns per month.
      // Col 1: Days 1-10
      // Col 2: Days 11-20
      // Col 3: Days 21-End

      const colRanges = [
        { start: 1, end: 10 },
        { start: 11, end: 20 },
        { start: 21, end: daysInMonth }
      ];

      const monthCols = colRanges.map((range, colIdx) => {
        const squares = [];
        for (let day = range.start; day <= range.end; day++) {
          // Check logs for this specific date
          // Ideally we match by Year-Month-Day
          // Just mocking opacity for demo based on day number
          let opacity = 0.1;
          // Deterministic pseudo-random for consistent look or real check
          const checkDate = new Date(d.getFullYear(), d.getMonth(), day);
          const count = logs.filter(l => {
            const lDate = new Date(l.timestamp);
            return l.habit_id === habit.id &&
              lDate.getDate() === day &&
              lDate.getMonth() === d.getMonth() &&
              lDate.getFullYear() === d.getFullYear();
          }).length;

          if (count > 0) {
            opacity = Math.min(1, Math.max(0.4, count / (habit.daily_goal || 1)));
          }
          // No else block - if no logs, opacity stays at 0.1

          squares.push(
            <div
              key={day}
              className={`w-3 h-3 rounded-[2px] mb-[2px]`}
              style={{
                backgroundColor: habit.type === HabitType.GOOD ? '#40c463' : '#e57373',
                opacity: opacity
              }}
            ></div>
          );
        }
        return (
          <div key={colIdx} className="flex flex-col gap-0 mr-[2px]">
            {squares}
          </div>
        );
      });

      months.push(
        <div key={i} className="flex flex-col mr-3">
          <span className="text-[10px] text-gray-400 mb-1 font-medium">{monthName}</span>
          <div className="flex">
            {monthCols}
          </div>
        </div>
      );
    }
    return months;
  };

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-32">
      {/* Log Detail Modal (Image 15) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={() => setSelectedLogId(null)}></div>
          <div className="relative w-full max-w-[320px] bg-white rounded-[24px] p-6 shadow-2xl transform transition-all scale-100 opacity-100 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-3">习惯打卡记录</h3>
            <p className="text-[15px] leading-relaxed text-gray-500 mb-8">
              你在 {formatDate(selectedLog.timestamp)} <br />打卡了{habit.type === HabitType.GOOD ? '好' : '坏'}习惯：<span className="text-gray-900 font-medium">{habit.name}</span>
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => navigate(`/journal/${selectedLog.id}`)}
                className="w-full py-3.5 px-4 bg-[#2c2c2e] text-white text-[15px] font-bold rounded-full shadow-md active:scale-95 transition-transform hover:bg-black"
              >
                写点什么记录一下
              </button>
              <button
                onClick={() => { deleteLog(selectedLog.id); setSelectedLogId(null); }}
                className="w-full py-3.5 px-4 bg-white border border-red-500 text-red-500 text-[15px] font-bold rounded-full active:bg-red-50 active:scale-95 transition-all"
              >
                删除这条记录
              </button>
              <button
                onClick={() => setSelectedLogId(null)}
                className="w-full py-3.5 px-4 bg-white border border-gray-300 text-gray-500 text-[15px] font-medium rounded-full active:bg-gray-50 active:scale-95 transition-all"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-100/50">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 text-gray-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-center flex-grow pr-8">习惯详情</h1>
      </header>

      <main className="max-w-md mx-auto w-full">
        <section className="mt-2 px-4">
          <div className="bg-[#f2f2f7] rounded-[20px] p-5 shadow-sm relative overflow-hidden">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl text-black font-bold">{habit.name}</h2>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${habit.type === HabitType.GOOD
                  ? 'bg-green-100 text-green-700 ring-green-600/20'
                  : 'bg-red-100 text-red-700 ring-red-600/20'
                  }`}>
                  {habit.type === HabitType.GOOD ? '好习惯' : '坏习惯'}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-3">{habit.description}</p>
              <div className="bg-white/60 rounded-xl p-3 space-y-1.5 border border-black/5">
                {habit.type === HabitType.GOOD && (
                  <p className="text-sm text-gray-800"><span className="text-gray-500 font-medium">目标：</span>今日 {habit.todaysTarget ?? habit.daily_goal} 次，本周 {habit.frequency.length} 次</p>
                )}
                <p className="text-sm text-gray-800"><span className="text-gray-500 font-medium">累计打卡：</span>今日 {habit.todayCount} 次，本周 {habit.thisWeekDays || 0} 天</p>
              </div>
            </div>
            <div className="flex items-end justify-between relative mt-4">
              <div className="w-24 h-24 flex-shrink-0 relative z-10">
                <img alt="Black Cat" className="w-full h-full object-contain drop-shadow-lg rounded-full mix-blend-multiply" src={IMAGES.CAT_HEAD} />
              </div>
              <div className="relative bg-white border-2 border-black rounded-[16px] p-3 mb-4 ml-3 flex-grow shadow-sm
                before:content-[''] before:absolute before:left-[-8px] before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-4 before:bg-white before:border-l-[2px] before:border-l-black before:border-b-[2px] before:border-b-black before:rotate-45
              ">
                <p className={`text-sm font-medium leading-snug text-black relative z-10 ${detailRemarkLoading ? 'opacity-70' : ''}`}>
                  {detailRemark}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 px-4">
          <div className="bg-[#f2f2f7] rounded-[20px] p-5 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-black">统计</h3>
              <span className="text-xs text-gray-500">最近6个月</span>
            </div>
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex w-max min-w-full pb-2">
                {renderHeatmap()}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">过去半年共打卡 128 次</p>
          </div>
        </section>

        <section className="mt-4 px-4 flex gap-3">
          <button
            onClick={handleCheckIn}
            className="flex-grow bg-[#2c2c2e] text-white rounded-[30px] py-3.5 px-6 font-semibold shadow-lg active:scale-95 transition-transform text-lg"
          >
            打卡
          </button>
          <button
            onClick={handleEditHabit}
            className="flex-shrink-0 bg-white border-2 border-black text-black rounded-[30px] py-3.5 px-6 font-bold shadow-sm active:scale-95 transition-transform text-lg whitespace-nowrap"
          >
            编辑习惯
          </button>
          <button
            onClick={handleDeleteHabit}
            className="flex-shrink-0 bg-white border-2 border-red-500 text-red-500 rounded-[30px] py-3.5 px-6 font-bold shadow-sm active:scale-95 transition-transform text-lg whitespace-nowrap"
          >
            删除
          </button>
        </section>

        <section className="mt-6 px-4">
          <div className="bg-[#f2f2f7] rounded-t-[20px] pb-8 overflow-hidden">
            <div className="p-4 border-b border-gray-300 flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-black">打卡历史</h2>
              <span className="text-xs text-gray-400 font-normal">点击记录可编辑或删除</span>
            </div>
            <ul className="flex flex-col">
              {habitLogs.map((log) => (
                <li
                  key={log.id}
                  onClick={() => handleLogClick(log.id)}
                  className="flex justify-between items-center px-4 py-4 border-b border-gray-300/60 active:bg-gray-200 transition-colors cursor-pointer"
                >
                  <span className="text-base font-medium text-gray-800">{formatDate(log.timestamp)} 打卡了此习惯</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HabitDetailsPage;
