import { Habit, HabitType, Log } from './types';

export const IMAGES = {
  CAT_AVATAR: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVo_waTH3dhUXpXMJQTDOPF6VuMx3ZkLdTKCPR2EXjQBR6fhY-SYGsA2Nh2s1yFHFRhwIIi9DFXuR9Of2G121nBEsnCF9qRmYdzhh1vN00eip-uHXZ42r9sq7TZMwR_Qy04Qbz3S0VkzmOHjLiXpxzt5tpvJhbj7fedYmj_NreSkaZs71wyR-4vBuZ_2Lpz_T2HXKYXEvt59LJt3pYVM7USEh-Lvm14Ugk5JFiCjxWZmCLdPweTqlWspWfJCoex8_onoikQyUpjhgw",
  USER_AVATAR: "https://lh3.googleusercontent.com/aida-public/AB6AXuA7EFox1DcFuFJHD1bKH0cwGbcL3ImR11UMu0PMxTXADu6uddrqcrZ6KaifG_VArME7FHBt3ruLZvstK6KJMHzXI3y4wZX36R7g24vYeA7W4wt_trwb6lj3MXRcxBJp7cBxJDdWYd2yyKVspR_DCOtS4fuy0SLOgL8zRVJXKOZfp5dz0J5LPSm02mtpeSJAzJsw7Rclt0zd6K8XmX9Z-KyXmGm6dCnT7FzdllNqXIp7Drv3H9gFFzTvvdE2UxVFtzBfp2AloyGcZPF2",
  CAT_INSTRUCTOR: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhU-c7hSfsCE4SmrfmG7U0YIKfeJYmqVA40PUFMpO5doadfU62Iag6_JGBWeWKlJlqLJkO6swB5vdRUH0eh3hZG5BHklI8IDAXIRTXy5N-l8E54oqokfSwuB_ufxPv9KgVAr4m_g_S1Sp3dnjzJh8GjbOwTWUDIoAZirh2JP9D710EmJmod3S3J1eesMmbjNvgNbRCXVDrGB3TayMvtuS4CWlth3l_BkVLNgBlt6aR8vR-hzxV41MMHuEJawzH-v9G-OWPf2eFLabe",
  CAT_DISAPPROVING: "https://lh3.googleusercontent.com/aida-public/AB6AXuAj_31k5xwOIQVtM_c8Xl-ZnTQOtkbzE7nNjfDsvRimrEB9zV9jZ26LIr1o4No9QCJ1Bnwqmj15-uoFHHOwNw1G5MLjtARTIurgquTGcSIR7FOqmBY3H7yfbSZDFtJpAuNspozF4xrR9oOAl6uz3gfHlvX-AK5_pGCPEYUzIqUf4zxt_Ss59PkMU6RuA8RB1wMJZCXtGp9KqAXPjoEOnp3RtJ9LW6Rw1k7YffZqBD4mKQFIKuJbomxbb47GZ_f1JWrHCMD3N4YnqjkK",
  CAT_HEAD: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtB5yZdmPzgqypqFqyD8nd1wWk-p0f_9VD9lhLFBuPA35dEB1vWkAUzq9PbMOyFnDY6LtIPY5F8MOc32_YvMI3KIL4-nYw9V9s2sFH4B3Oj2RNQd6iAmk4z_RA-_r745-lMrgRQiGtpP6Fh5j_WT7C3tLJOUyvx7YG6LgCRER-tda7cBCn12HoS1zPiEF2_qeKHTV9vp9DpM-6DURpRDSyURLWtXkXL7Qd8N_srZcsIWKc5rPe_yHlbBHSkpGkcMRDMX3YSNYkBTMt",
  MASCOT_STANDING: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4dba8wB_w6UEv44eZ1t2kI9-4wTh8jyC7vWrr0ocXg54iKmacqb8heYbqKXjpM_6selptyYcRIkcsSNtcVI7AZg0sIskJB8_bb0CICUgMxv4rhj_bADbxlXRt8ICtbm9401yMrEudWt5BpB0TNBVCreUohay-511f_vnMDk6dSA9i-LO5DzRFYMgZSt8nCvdrMZuq_jGpYxxfSHVBKU2nl_zCgULzFCY-HgBQ-FI7aTEdUGdJAVQufmeMDOKf2oKQxmOWj4Zv6AYq"
};

export const INITIAL_HABITS: Habit[] = [
  {
    id: '1',
    name: '晨跑',
    type: HabitType.GOOD,
    description: '工作前清醒一下�?,
    frequency: [1, 2, 3, 4, 5],
    daily_goal: 1,
    reminders: ['07:00'],
    streak: 5,
    todayCount: 1,
  },
  {
    id: '2',
    name: '控糖',
    type: HabitType.BAD,
    description: '避免下午犯困�?,
    frequency: [0, 1, 2, 3, 4, 5, 6],
    daily_goal: 3,
    reminders: [],
    streak: 3,
    todayCount: 2,
  },
  {
    id: '3',
    name: '阅读30分钟',
    type: HabitType.GOOD,
    description: '睡前习惯养成�?,
    frequency: [0, 1, 2, 3, 4, 5, 6],
    daily_goal: 1,
    reminders: ['21:00'],
    streak: 12,
    todayCount: 1,
  },
  {
    id: '4',
    name: '冥想',
    type: HabitType.GOOD,
    description: '避免情绪失控�?,
    frequency: [0, 1, 2, 3, 4, 5, 6],
    daily_goal: 1,
    reminders: ['22:00'],
    streak: 2,
    todayCount: 0,
  },
  {
    id: '5',
    name: '喝水',
    type: HabitType.GOOD,
    description: '保持水分充足�?,
    frequency: [0, 1, 2, 3, 4, 5, 6],
    daily_goal: 8,
    reminders: [],
    streak: 7,
    todayCount: 3,
  },
];

export const INITIAL_LOGS: Log[] = [
  { id: '101', habit_id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: 'completed' }, // Today morning
  { id: '102', habit_id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), status: 'completed' }, // Yesterday
  { id: '103', habit_id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: 'completed' },
];



