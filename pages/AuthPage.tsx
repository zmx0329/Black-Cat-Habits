import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { IMAGES } from '../constants';

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login
                console.log('🔐 Attempting login...');
                const { data, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });

                if (loginError) {
                    console.error('❌ Login error:', loginError);
                    setError(translateError(loginError.message));
                    setLoading(false);
                    return;
                }

                console.log('✅ Login successful, user:', data.user?.id);
                // Wait a moment for auth state to propagate
                await new Promise(resolve => setTimeout(resolve, 500));
                // Navigate to home
                navigate('/', { replace: true });
            } else {
                // Signup
                console.log('📝 Attempting signup...');
                const { data: signupData, error: signupError } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                    options: {
                        data: {
                            username: username.trim()
                        }
                    }
                });

                if (signupError) {
                    console.error('❌ Signup error:', signupError);
                    setError(translateError(signupError.message));
                    setLoading(false);
                    return;
                }

                console.log('✅ Signup successful, user:', signupData.user?.id);

                // Auto-login after signup
                console.log('🔐 Auto-login after signup...');
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });

                if (loginError) {
                    console.error('❌ Auto-login error:', loginError);
                    setError(translateError(loginError.message));
                    setLoading(false);
                    return;
                }

                console.log('✅ Auto-login successful, user:', loginData.user?.id);
                // Wait a moment for auth state to propagate
                await new Promise(resolve => setTimeout(resolve, 500));
                // Navigate to home
                navigate('/', { replace: true });
            }
        } catch (err) {
            console.error('❌ Auth error:', err);
            setError('发生错误，请稍后重试');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-gray-100 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-gray-200 rounded-full blur-3xl opacity-60"></div>

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                        <img
                            src={IMAGES.CAT_HEAD}
                            alt="Logo"
                            className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-black text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            严格模式
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {isLogin ? '欢迎回来' : '加入黑猫'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {isLogin ? '准备好面对今天的挑战了吗？' : '开始你的自律（受虐）之旅'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        {!isLogin && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fas fa-user text-gray-400 group-focus-within:text-black transition-colors"></i>
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="用户名"
                                    required={!isLogin}
                                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl text-base font-medium outline-none transition-all placeholder-gray-400"
                                />
                            </div>
                        )}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <i className="fas fa-envelope text-gray-400 group-focus-within:text-black transition-colors"></i>
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="邮箱"
                                required
                                className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl text-base font-medium outline-none transition-all placeholder-gray-400"
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <i className="fas fa-lock text-gray-400 group-focus-within:text-black transition-colors"></i>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="密码"
                                required
                                className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl text-base font-medium outline-none transition-all placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#2c2c2e] text-white rounded-2xl font-bold text-lg shadow-lg shadow-gray-200 active:scale-[0.98] transition-all hover:bg-black hover:shadow-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                            isLogin ? '登录' : '注册'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-gray-500 font-medium text-sm hover:text-black transition-colors underline decoration-transparent hover:decoration-black underline-offset-4"
                    >
                        {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Error message translation
const translateError = (error: string): string => {
    const errorMap: Record<string, string> = {
        'Invalid login credentials': '邮箱或密码错误',
        'Email not confirmed': '邮箱未验证，请检查邮箱',
        'User already registered': '该邮箱已被注册',
        'Password should be at least 6 characters': '密码至少需要6个字符',
        'Unable to validate email address: invalid format': '邮箱格式不正确',
        'Signup requires a valid password': '请输入有效密码',
        'Email rate limit exceeded': '操作过于频繁，请稍后再试',
        'Invalid email or password': '邮箱或密码错误',
    };

    for (const [key, value] of Object.entries(errorMap)) {
        if (error.includes(key)) return value;
    }

    return error;
};

export default AuthPage;
