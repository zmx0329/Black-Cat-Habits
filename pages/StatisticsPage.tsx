import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HabitType } from '../types';
import { IMAGES } from '../constants';

const StatisticsPage: React.FC = () => {
    const { logs, habits } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Check if date is selected
    const isSelected = (date: Date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    const toLocalDateKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Get logs for a specific date (local time to avoid timezone shift)
    const getLogsForDate = (date: Date) => {
        const dateKey = toLocalDateKey(date);
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return toLocalDateKey(logDate) === dateKey;
        });
    };

    // Get day status (good habit, bad habit, or both)
    const getDayStatus = (date: Date) => {
        const dayLogs = getLogsForDate(date);
        if (dayLogs.length === 0) return null;

        const hasGood = dayLogs.some(log => {
            const habit = habits.find(h => h.id === log.habit_id);
            return habit?.type === HabitType.GOOD;
        });

        const hasBad = dayLogs.some(log => {
            const habit = habits.find(h => h.id === log.habit_id);
            return habit?.type === HabitType.BAD;
        });

        if (hasGood && hasBad) return 'both';
        if (hasGood) return 'good';
        if (hasBad) return 'bad';
        return null;
    };

    // Render day dots
    const renderDayDots = (date: Date) => {
        const status = getDayStatus(date);
        if (!status) return null;

        if (status === 'both') {
            return (
                <div className="flex h-1.5 gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#66bb6a]"></span>
                    <span className="w-1 h-1 rounded-full bg-[#FF5E7D]"></span>
                </div>
            );
        }

        return (
            <div className="flex h-1.5">
                <span className={`w-1 h-1 rounded-full ${status === 'good' ? 'bg-[#66bb6a]' : 'bg-[#FF5E7D]'}`}></span>
            </div>
        );
    };

    // Get selected date logs with habit info
    const selectedDateLogs = useMemo(() => {
        const dayLogs = getLogsForDate(selectedDate);
        return dayLogs.map(log => {
            const habit = habits.find(h => h.id === log.habit_id);
            const logTime = new Date(log.timestamp);
            return {
                time: logTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                name: habit?.name || '未知习惯',
                type: habit?.type || HabitType.GOOD,
            };
        }).sort((a, b) => a.time.localeCompare(b.time));
    }, [selectedDate, logs, habits]);

    // Generate calendar days
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const startingEmptyDays = Array.from({ length: firstDay }, (_, i) => i);

    // Format month/year display
    const monthYearDisplay = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

    // Format selected date display
    const formatSelectedDate = () => {
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();
        return `${month}月${day}日`;
    };

    return (
        <div className="bg-white min-h-screen pb-24">
            <header className="flex justify-between items-center px-6 pt-8 pb-4">
                <h1 className="text-3xl font-bold tracking-tight">{monthYearDisplay}</h1>
                <div className="flex items-center space-x-6 text-gray-400">
                    <button onClick={goToPreviousMonth} aria-label="Previous Month">
                        <i className="fa-solid fa-chevron-left text-xl"></i>
                    </button>
                    <button onClick={goToNextMonth} aria-label="Next Month">
                        <i className="fa-solid fa-chevron-right text-xl text-black"></i>
                    </button>
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
                    {calendarDays.map(day => {
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const isTodayDate = isToday(date);
                        const isSelectedDate = isSelected(date);

                        return (
                            <div key={day} className="flex flex-col items-center">
                                <button
                                    onClick={() => setSelectedDate(date)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl mb-1 transition-colors ${isSelectedDate ? 'bg-[#eeeeee]' : isTodayDate ? 'bg-gray-100' : ''
                                        }`}
                                >
                                    <span className="text-lg font-medium">{day}</span>
                                </button>
                                {renderDayDots(date)}
                            </div>
                        );
                    })}
                </div>
            </section>

            <hr className="border-t border-gray-100 mb-8 mt-4 mx-4" />

            <section className="px-6 mb-8">
                <h2 className="font-bold mb-6 text-[20px]">今日总结：{formatSelectedDate()}</h2>
                <div className="flex items-center mb-6">
                    <div className="flex-shrink-0 mr-4">
                        <img alt="Mascot" src={IMAGES.MASCOT_STANDING} style={{ width: '100px', mixBlendMode: 'multiply' }} />
                    </div>
                    <div className="relative bg-white border-2 border-black rounded-[15px] p-4 text-left
                     before:content-[''] before:absolute before:left-[-12px] before:top-1/2 before:-translate-y-1/2 before:border-r-[12px] before:border-r-black before:border-y-[10px] before:border-y-transparent
                     after:content-[''] after:absolute after:left-[-8px] after:top-1/2 after:-translate-y-1/2 after:border-r-[9px] after:border-r-white after:border-y-[7px] after:border-y-transparent
                ">
                        <p className="text-lg leading-tight font-medium text-black">
                            {selectedDateLogs.length === 0
                                ? '这一天你除了呼吸一无所成。'
                                : selectedDateLogs.length >= 5
                                    ? '难得的勤奋，继续保持。'
                                    : '还在找借口？时间一分一秒在流逝。'}
                        </p>
                    </div>
                </div>
            </section>

            <section className="px-6 pb-8">
                {selectedDateLogs.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">这一天没有打卡记录</p>
                ) : (
                    <ul className="space-y-3">
                        {selectedDateLogs.map((log, idx) => (
                            <li key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-base text-gray-800">
                                    {formatSelectedDate()} {log.time} 打卡了
                                    {log.type === HabitType.GOOD ? '好' : <span className="text-[#FF5E7D] font-bold">坏</span>}
                                    习惯：{log.name}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default StatisticsPage;
