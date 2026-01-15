import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Habit, HabitType } from '../types';
import { IMAGES } from '../constants';

const AddEditHabitPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { habits, addHabit, updateHabit } = useApp();

  const isEdit = Boolean(id);
  const [formData, setFormData] = useState<Partial<Habit>>({
    name: '',
    type: HabitType.GOOD,
    frequency: [1, 2, 3, 4, 5],
    daily_goal: 1,
    description: '',
    reminders: [],
    todayCount: 0,
    streak: 0,
  });

  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Time Picker State
  const [pickerTime, setPickerTime] = useState({ hour: '08', minute: '00' });
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ITEM_HEIGHT = 40;

  useEffect(() => {
    if (isEdit && id) {
      const habit = habits.find(h => h.id === id);
      if (habit) {
        setFormData(habit);
        if (habit.reminders && habit.reminders.length > 0) {
          setRemindersEnabled(true);
        }
      }
    }
  }, [id, habits, isEdit]);

  // Scroll to initial position when picker opens
  useEffect(() => {
    if (showTimePicker) {
      // Small timeout to ensure DOM is rendered
      setTimeout(() => {
        if (hourScrollRef.current) {
          const hourIdx = hours.indexOf(pickerTime.hour);
          if (hourIdx !== -1) hourScrollRef.current.scrollTop = hourIdx * ITEM_HEIGHT;
        }
        if (minuteScrollRef.current) {
          const minuteIdx = minutes.indexOf(pickerTime.minute);
          if (minuteIdx !== -1) minuteScrollRef.current.scrollTop = minuteIdx * ITEM_HEIGHT;
        }
      }, 50);
    }
  }, [showTimePicker]);

  const handleSubmit = async () => {
    if (!formData.name) return;

    try {
      console.log('💾 Saving habit...', formData.name);

      if (isEdit && id) {
        await updateHabit({ ...formData, id } as Habit);
        console.log('✅ Habit updated');
      } else {
        await addHabit({
          name: formData.name,
          type: formData.type || HabitType.GOOD,
          description: formData.description || '',
          frequency: formData.frequency || [1, 2, 3, 4, 5],
          daily_goal: formData.daily_goal || 1,
          reminders: formData.reminders || [],
          streak: 0,
        });
        console.log('✅ Habit added');
      }

      // Wait a moment for the database operation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(-1);
    } catch (error) {
      console.error('❌ Error saving habit:', error);
      // Still navigate back even if there's an error
      navigate(-1);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const current = formData.frequency || [];
    if (current.includes(dayIndex)) {
      setFormData({ ...formData, frequency: current.filter(d => d !== dayIndex) });
    } else {
      setFormData({ ...formData, frequency: [...current, dayIndex] });
    }
  };

  const removeReminder = (timeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders?.filter(t => t !== timeToRemove)
    }));
  };

  const confirmTime = () => {
    const time = `${pickerTime.hour}:${pickerTime.minute}`;
    const current = formData.reminders || [];
    if (!current.includes(time)) {
      setFormData({ ...formData, reminders: [...current, time].sort() });
    }
    setShowTimePicker(false);
  };

  const handleScroll = (type: 'hour' | 'minute') => {
    const ref = type === 'hour' ? hourScrollRef : minuteScrollRef;
    if (ref.current) {
      const index = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      if (type === 'hour') {
        const val = hours[Math.min(hours.length - 1, Math.max(0, index))];
        setPickerTime(prev => ({ ...prev, hour: val }));
      } else {
        const val = minutes[Math.min(minutes.length - 1, Math.max(0, index))];
        setPickerTime(prev => ({ ...prev, minute: val }));
      }
    }
  };

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return (
    <div className="bg-white min-h-screen flex flex-col items-center relative">
      <main className="w-full max-w-md px-5 pb-8 flex flex-col h-full relative z-10">
        <div aria-hidden="true" className="h-4 w-full"></div>
        <header className="py-4 flex items-center justify-center relative mb-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="absolute left-0 p-2 -ml-2 text-black active:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined text-3xl font-light">arrow_back_ios_new</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">{isEdit ? '编辑习惯' : '添加习惯'}</h1>
        </header>

        <form className="flex-1 flex flex-col space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div data-purpose="input-group">
            <label className="block text-base font-bold mb-2" htmlFor="habitName">习惯名称</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#7676801F] border-none focus:ring-0 rounded-xl py-3 px-4 text-gray-800 placeholder-gray-400 transition-colors"
              id="habitName"
              placeholder="例如：晨跑"
              type="text"
            />
          </div>

          <div data-purpose="segmented-control">
            <span className="block text-base font-bold mb-2">习惯类型</span>
            <div className="p-[2px] rounded-[8px] flex items-center h-10 bg-[#7676801F] gap-0">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: HabitType.GOOD })}
                className={`w-1/2 flex items-center justify-center space-x-2 rounded-[7px] h-full font-medium transition-all ${formData.type === HabitType.GOOD
                  ? 'bg-white border-2 border-[#34C759] text-[#34C759] shadow-sm'
                  : 'bg-transparent text-gray-500 border-none'
                  }`}
              >
                <i className="fas fa-check-circle text-lg"></i><span>好习惯</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: HabitType.BAD })}
                className={`w-1/2 flex items-center justify-center space-x-2 rounded-[7px] h-full font-medium transition-all ${formData.type === HabitType.BAD
                  ? 'bg-white border-2 border-[#FF3B30] text-[#FF3B30] shadow-sm'
                  : 'bg-transparent text-gray-500 border-none'
                  }`}
              >
                <i className="fas fa-times-circle text-lg"></i><span>坏习惯</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-bold mb-4">计划</h2>
            <div className="space-y-5">
              <div data-purpose="frequency-grid">
                <label className="block text-base font-bold mb-2">频率</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((day, index) => {
                    const isSelected = formData.frequency?.includes(index);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold shadow-sm transition-all ${isSelected ? 'bg-[#38393D] text-white' : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-50'
                          }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div data-purpose="daily-times">
                <label className="block text-base font-bold mb-2">每日次数</label>
                <div className="bg-[#7676801F] rounded-xl p-1.5 flex items-center justify-between h-14">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, daily_goal: Math.max(1, (formData.daily_goal || 1) - 1) })}
                    className="w-12 h-full bg-white rounded-[9px] shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-xl">remove</span>
                  </button>
                  <div className="flex-1 text-center flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900 leading-none">{formData.daily_goal}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, daily_goal: (formData.daily_goal || 1) + 1 })}
                    className="w-12 h-full bg-white rounded-[9px] shadow-sm flex items-center justify-center text-black active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div data-purpose="input-group">
            <label className="block text-base font-bold mb-2" htmlFor="description">描述（选填）</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#7676801F] border-none focus:ring-0 rounded-xl py-3 px-4 text-gray-800 placeholder-gray-400 h-28 resize-none transition-colors"
              id="description"
              placeholder="添加备注或动力..."
            ></textarea>
          </div>

          <div data-purpose="reminders-group">
            <div className="flex items-center justify-between mb-4">
              <label className="text-base font-bold text-black">提醒设置</label>
              <button
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors relative shadow-inner ${remindersEnabled ? 'bg-[#34C759]' : 'bg-gray-300'}`}
                type="button"
              >
                <div className={`w-[27px] h-[27px] bg-white rounded-full shadow-md absolute top-[2px] transition-transform ${remindersEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {remindersEnabled && (
              <div className="bg-[#7676801F] rounded-xl p-4 space-y-4 animate-[fadeIn_0.3s]">
                <div className="flex flex-wrap gap-2">
                  {formData.reminders?.map((time) => (
                    <div key={time} className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm border border-gray-100">
                      <span className="text-sm font-bold font-mono tracking-wide">{time}</span>
                      <button
                        type="button"
                        onClick={() => removeReminder(time)}
                        className="text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                      >
                        <i className="fas fa-times-circle text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="w-full py-3 flex items-center justify-center space-x-2 bg-[#38393D] text-white rounded-xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-lg">add_alarm</span>
                  <span>添加时间</span>
                </button>
              </div>
            )}
          </div>
        </form>

        <div className="mt-8 mb-24 w-full relative">
          <div className="flex items-end space-x-4">
            <div className="flex-shrink-0 relative z-10 -mb-2 ml-2">
              <img alt="Disapproving Cat" className="h-auto object-contain w-[120px]" src={IMAGES.CAT_DISAPPROVING} />
            </div>
            <div className="relative bg-white border-2 border-black rounded-[15px] p-[10px] shadow-sm max-w-[200px] mb-8
                     before:content-[''] before:absolute before:left-[-10px] before:top-1/2 before:-translate-y-1/2 before:border-r-[10px] before:border-r-black before:border-y-[10px] before:border-y-transparent
                     after:content-[''] after:absolute after:left-[-7px] after:top-1/2 after:-translate-y-1/2 after:border-r-[8px] after:border-r-white after:border-y-[8px] after:border-y-transparent
                ">
              <p className="font-medium text-black leading-tight text-sm">
                别忘了定个闹钟。<br />你的记性我可不敢恭维。
              </p>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-sm p-5 border-t border-gray-100 flex justify-center z-50">
          <button
            onClick={handleSubmit}
            className="w-full max-w-md bg-[#38393D] text-white font-semibold text-lg py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          >
            {isEdit ? '保存修改' : '添加习惯'}
          </button>
        </div>
        <div className="h-20 w-full"></div>
      </main>

      {/* Scrollable Time Picker Overlay */}
      {showTimePicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
          <div className="w-full max-w-md bg-white rounded-t-2xl p-6 shadow-2xl flex flex-col animate-[slideUp_0.3s] pb-safe">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900">选择时间</h3>
              <button onClick={() => setShowTimePicker(false)} className="text-gray-400 p-2 text-sm font-medium">
                取消
              </button>
            </div>

            {/* Picker Container */}
            <div className="relative h-48 mb-6">
              {/* Highlight Bar */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[40px] bg-gray-100 rounded-lg -z-10 pointer-events-none mx-4"></div>

              <div className="flex justify-center gap-8 h-full">
                {/* Hours Column */}
                <div
                  ref={hourScrollRef}
                  onScroll={() => handleScroll('hour')}
                  className="w-16 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[76px]"
                >
                  {hours.map(h => (
                    <div
                      key={h}
                      onClick={() => {
                        setPickerTime(prev => ({ ...prev, hour: h }));
                        hourScrollRef.current?.scrollTo({ top: hours.indexOf(h) * ITEM_HEIGHT, behavior: 'smooth' });
                      }}
                      className={`h-[40px] flex items-center justify-center snap-center text-xl font-medium cursor-pointer transition-all ${pickerTime.hour === h ? 'text-black font-bold scale-110' : 'text-gray-300'}`}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                <div className="flex items-center text-xl font-bold pb-1">:</div>

                {/* Minutes Column */}
                <div
                  ref={minuteScrollRef}
                  onScroll={() => handleScroll('minute')}
                  className="w-16 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[76px]"
                >
                  {minutes.map(m => (
                    <div
                      key={m}
                      onClick={() => {
                        setPickerTime(prev => ({ ...prev, minute: m }));
                        minuteScrollRef.current?.scrollTo({ top: minutes.indexOf(m) * ITEM_HEIGHT, behavior: 'smooth' });
                      }}
                      className={`h-[40px] flex items-center justify-center snap-center text-xl font-medium cursor-pointer transition-all ${pickerTime.minute === m ? 'text-black font-bold scale-110' : 'text-gray-300'}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={confirmTime}
              className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform shadow-lg"
            >
              确认添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEditHabitPage;