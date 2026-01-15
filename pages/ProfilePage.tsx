import React from 'react';
import { useApp } from '../context/AppContext';
import { IMAGES } from '../constants';

const ProfilePage: React.FC = () => {
    const { user, logout } = useApp();

    const handleLogout = async () => {
        console.log('🔓 User clicked logout');
        await logout();
        // AppContext logout will handle navigation
    };

    return (
        <div className="bg-[#F2F2F7] min-h-screen pb-24">
            <header className="px-6 pt-12 pb-6">
                <div className="flex items-center gap-4">
                    <img src={IMAGES.USER_AVATAR} alt="User" className="w-20 h-20 rounded-full border-4 border-white shadow-sm" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user?.username || '自律达人'}</h1>
                        <p className="text-gray-500 text-sm mt-1">坚持打卡 128 天</p>
                    </div>
                </div>
            </header>

            <main className="px-4 space-y-4">

                <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><i className="fas fa-cog"></i></span>
                            <span className="font-medium">设置</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-300 text-sm"></i>
                    </div>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><i className="fas fa-info-circle"></i></span>
                            <span className="font-medium">关于我们</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-300 text-sm"></i>
                    </div>
                </section>

                <button
                    onClick={handleLogout}
                    className="w-full py-4 text-red-500 font-bold bg-white rounded-2xl shadow-sm active:bg-gray-50 transition-colors"
                >
                    退出登录
                </button>
            </main>
        </div>
    );
};

export default ProfilePage;