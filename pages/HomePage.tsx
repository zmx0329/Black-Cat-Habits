import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Habit, HabitType } from '../types';
import { IMAGES } from '../constants';

const HomePage: React.FC = () => {
  const { habits, addLog, deleteLog, reorderHabits, logs } = useApp();
  const navigate = useNavigate();
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Drag and Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleCheckIn = (e: React.MouseEvent, habit: Habit) => {
    e.stopPropagation();
    performCheckIn(habit);
  };

  const performCheckIn = async (habit: Habit) => {
    if (isSorting || isChecking) return;
    setIsChecking(true);
    setSelectedHabit(habit);

    const newLog = await addLog(habit.id);
    if (newLog?.id) {
      setCurrentLogId(newLog.id);
    }

    setIsChecking(false);
  };

  const handleCardClick = (habit: Habit) => {
    if (isSorting) return;
    performCheckIn(habit);
  };

  const closeModal = () => {
    setSelectedHabit(null);
    setCurrentLogId(null);
  };

  const handleUndo = async () => {
    if (selectedHabit) {
      const recentLog = currentLogId
        ? logs.find(l => l.id === currentLogId)
        : logs.find(l => l.habit_id === selectedHabit.id);
      if (recentLog) {
        await deleteLog(recentLog.id);
      }
    }
    closeModal();
  };

  const handleRecordFromModal = () => {
    if (currentLogId) {
      navigate(`/journal/${currentLogId}`);
      return;
    }
    if (selectedHabit) {
      const recentLog = logs.find(l => l.habit_id === selectedHabit.id);
      if (recentLog) {
        navigate(`/journal/${recentLog.id}`);
      }
    }
  };

  const handleDetailsClick = (e: React.MouseEvent, habitId: string) => {
    e.stopPropagation();
    navigate(`/details/${habitId}`);
  };

  // Drag Handlers
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    // Set data for mobile polyfill compatibility
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    e.currentTarget.classList.add('opacity-50');
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const copyListItems = [...habits];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      reorderHabits(copyListItems);
    }
  };

  const toggleSort = () => {
    setIsSorting(!isSorting);
  };

  return (
    <div className="pb-24 bg-[#F2F2F7] min-h-screen relative">


      <header className="bg-white px-4 pt-4 pb-12 rounded-b-[2rem] relative z-0 shadow-sm">
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto relative mt-2">
          <div className="flex-shrink-0 w-28 relative z-10">
            <img alt="Grumpy Cat" className="w-full h-auto object-contain scale-110 translate-y-2" src={IMAGES.CAT_INSTRUCTOR} />
          </div>
          <div className="relative bg-white border-2 border-black rounded-[15px] p-4 text-sm font-medium leading-snug w-48 shadow-sm ml-3
            before:content-[''] before:absolute before:left-[-12px] before:top-1/2 before:-translate-y-1/2 before:border-r-[12px] before:border-r-black before:border-y-[10px] before:border-y-transparent
            after:content-[''] after:absolute after:left-[-8px] after:top-1/2 after:-translate-y-1/2 after:border-r-[9px] after:border-r-white after:border-y-[7px] after:border-y-transparent
          ">
            <p>又是平庸的一天，我猜...</p>
          </div>
        </div>
      </header>

      {/* FAB Add Button */}
      <div className="relative z-20 flex justify-center -mt-8 mb-4">
        <button
          onClick={() => navigate('/add')}
          className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform bg-[#2c2c2e] shadow-[0_12px_24px_-6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-gray-800 z-30 ${isSorting ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <svg fill="none" height="32" viewBox="0 0 24 24" width="32" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M4 12H20" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
        </button>
      </div>

      <main className="px-4 pb-8 max-w-md mx-auto">
        {isSorting && <p className="text-center text-sm text-gray-500 mb-2">长按或拖拽卡片进行排序</p>}
        <div className="grid grid-cols-2 gap-3 relative">
          {habits.map((habit, index) => (
            <div
              key={habit.id}
              onClick={() => handleCardClick(habit)}
              draggable={isSorting}
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnter={(e) => onDragEnter(e, index)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col relative transition-transform ${isSorting ? 'cursor-move animate-pulse border-dashed border-2 border-gray-300' : 'active:scale-[0.98] cursor-pointer'}`}
            >
              {!isSorting && (
                <button
                  onClick={(e) => handleDetailsClick(e, habit.id)}
                  className="absolute top-3 right-3 text-gray-400 p-2 -mr-2 -mt-2 hover:bg-gray-50 rounded-full"
                >
                  <i className="fas fa-ellipsis-h"></i>
                </button>
              )}

              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 pr-4 mt-2">
                <h2 className="font-bold text-[15px] leading-tight text-gray-900">{habit.name}</h2>
                <span className="text-[10px] text-gray-500 font-medium">今日 {habit.todayCount} 次，本周 {habit.thisWeekDays || 0} 天</span>
              </div>
              <div className="mb-3 text-[10px] text-gray-400">
                目标：今日 {habit.daily_goal} 次，本周 {habit.frequency?.length || 0} 天
              </div>
              <div className="flex items-center gap-1.5 mt-auto pr-6">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${habit.type === HabitType.GOOD ? 'text-[#15803d] bg-[#dcfce7]' : 'text-[#b91c1c] bg-[#fee2e2]'
                  }`}>
                  {habit.type === HabitType.GOOD ? '好习惯' : '坏习惯'}
                </span>
                <span className="text-[10px] text-gray-600 truncate">{habit.description}</span>
              </div>
              <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                {habit.type === HabitType.GOOD ? <i className="fas fa-smile"></i> : <i className="fas fa-frown"></i>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Sort Button */}
      <div className="fixed bottom-24 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <button
          onClick={toggleSort}
          className={`pointer-events-auto border shadow-xl rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-semibold active:scale-95 transition-all ${isSorting ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-200'}`}
        >
          {isSorting ? <i className="fas fa-check text-xs"></i> : <i className="fas fa-sort text-xs"></i>}
          {isSorting ? '完成' : '排序'}
        </button>
      </div>

      {/* Check In Modal (Image 13) */}
      {selectedHabit && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-8"></div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex flex-col items-center">
                <div className="rounded-full bg-green-50 p-2 mb-3">
                  <i className="fas fa-check-circle text-6xl text-[#16a34a]"></i>
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  已打卡 <span className={selectedHabit.type === HabitType.GOOD ? "text-[#15803d]" : "text-red-600"}>{selectedHabit.type === HabitType.GOOD ? '好习惯' : '坏习惯'}</span>：{selectedHabit.name}
                </h2>
              </div>

              <div className="relative mb-10 w-full flex flex-col items-center">
                <div className="w-32 h-32 relative z-10">
                  <img alt="Cat Instructor" className="w-full h-full object-contain" src={IMAGES.CAT_INSTRUCTOR} />
                </div>
                <div className="relative bg-white border-2 border-black rounded-[15px] p-4 w-[280px] shadow-sm mt-3
                             before:content-[''] before:absolute before:-top-3 before:left-1/2 before:-translate-x-1/2 before:border-b-[12px] before:border-b-black before:border-x-[10px] before:border-x-transparent
                             after:content-[''] after:absolute after:-top-2 after:left-1/2 after:-translate-x-1/2 after:border-b-[9px] after:border-b-white after:border-x-[7px] after:border-x-transparent
                        ">
                  <p className="text-sm font-bold text-gray-800 leading-relaxed">
                    “终于舍得动了？<br />别以为这一次就能抵消你昨晚的熬夜。”
                  </p>
                </div>
              </div>

              <div className="flex w-full gap-3 px-2">
                <button
                  onClick={handleUndo}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-400 font-bold text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  撤销
                </button>
                <button
                  onClick={handleRecordFromModal}
                  aria-label="Add note"
                  className="flex-none w-14 flex items-center justify-center rounded-2xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  onClick={closeModal}
                  className="flex-[2] py-3.5 px-4 rounded-2xl bg-[#0F172A] text-white font-bold text-sm shadow-lg shadow-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>知道了</span>
                  <i className={`fas ${selectedHabit.type === HabitType.GOOD ? 'fa-smile text-yellow-400' : 'fa-meh text-gray-200'}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
