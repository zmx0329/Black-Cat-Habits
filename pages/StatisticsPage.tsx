import React from 'react';
import { useApp } from '../App';
import { HabitType } from '../types';
import { IMAGES } from '../constants';

const StatisticsPage: React.FC = () => {
  const { logs, habits } = useApp();

  // Mock Calendar Data Generation for Nov 2023 based on image
  const daysInMonth = 30;
  const monthName = "2023年11月";
  
  // Create array of 30 days
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const startingEmptyDays = [0, 0, 0]; // Wed start? Image shows 1st is Wed.

  const getDayDots = (day: number) => {
     // Mock logic to show colored dots
     if (day === 15) return [HabitType.GOOD, HabitType.BAD, HabitType.GOOD];
     if (day % 3 === 0) return [HabitType.GOOD, HabitType.GOOD, HabitType.GOOD];
     if (day % 2 === 0) return [HabitType.BAD];
     return [HabitType.GOOD];
  };

  const getLogsForDate = (date: string) => {
      // Return mock logs for "11月15日"
      return [
          { time: '07:15', name: '晨跑', type: HabitType.GOOD },
          { time: '09:30', name: '喝水', type: HabitType.GOOD },
          { time: '14:20', name: '控糖', type: HabitType.BAD },
          { time: '19:45', name: '阅读30分钟', type: HabitType.GOOD },
          { time: '22:10', name: '冥想', type: HabitType.GOOD },
      ];
  };
  
  const renderDot = (type: HabitType, idx: number) => (
      <span key={idx} className={`w-1 h-1 rounded-full mx-[1px] ${type === HabitType.GOOD ? 'bg-[#66bb6a]' : 'bg-[#FF5E7D]'}`}></span>
  );

  return (
    <div className="bg-white min-h-screen pb-24">
        <header className="flex justify-between items-center px-6 pt-8 pb-4">
            <h1 className="text-3xl font-bold tracking-tight">{monthName}</h1>
            <div className="flex items-center space-x-6 text-gray-400">
                <button aria-label="Previous Month"><i className="fa-solid fa-chevron-left text-xl"></i></button>
                <button aria-label="Next Month"><i className="fa-solid fa-chevron-right text-xl text-black"></i></button>
            </div>
        </header>

        <section className="px-4 mb-8">
            <div className="grid grid-cols-7 mb-4 text-center">
                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="text-lg font-medium">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 row-gap-4 text-center gap-y-4">
                {startingEmptyDays.map((_, i) => <div key={`empty-${i}`}></div>)}
                {calendarDays.map(day => (
                    <div key={day} className="flex flex-col items-center">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl mb-1 ${day === 15 ? 'bg-[#eeeeee]' : ''}`}>
                             <span className="text-lg font-medium">{day}</span>
                        </div>
                        <div className="flex h-1.5">
                            {getDayDots(day).map((type, idx) => renderDot(type, idx))}
                        </div>
                    </div>
                ))}
            </div>
        </section>

        <hr className="border-t border-gray-100 mb-8 mt-4 mx-4"/>

        <section className="px-6 mb-8">
            <h2 className="font-bold mb-6 text-[20px]">今日总结：11月15日</h2>
            <div className="flex items-center mb-6">
                <div className="flex-shrink-0 mr-4">
                    <img alt="Mascot" src={IMAGES.MASCOT_STANDING} style={{ width: '100px', mixBlendMode: 'multiply' }} />
                </div>
                <div className="relative bg-white border-2 border-black rounded-[15px] p-4 text-left
                     before:content-[''] before:absolute before:left-[-12px] before:top-1/2 before:-translate-y-1/2 before:border-r-[12px] before:border-r-black before:border-y-[10px] before:border-y-transparent
                     after:content-[''] after:absolute after:left-[-8px] after:top-1/2 after:-translate-y-1/2 after:border-r-[9px] after:border-r-white after:border-y-[7px] after:border-y-transparent
                ">
                    <p className="text-lg leading-tight font-medium text-black">还在找借口？时间一分一秒在流逝。</p>
                </div>
            </div>
        </section>

        <section className="px-6 pb-8">
            <ul className="space-y-3">
                {getLogsForDate("").map((log, idx) => (
                    <li key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-base text-gray-800">
                            11月15日 {log.time} 打卡了{log.type === HabitType.GOOD ? '好' : <span className="text-[#FF5E7D] font-bold">坏</span>}习惯：{log.name}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    </div>
  );
};

export default StatisticsPage;