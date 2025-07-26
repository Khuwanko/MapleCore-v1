'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, User, Lock, Eye, EyeOff, Mail, Sparkles, Check, ArrowRight, Star, Calendar, Shield, Trophy, Crown, Zap, HelpCircle, Key } from 'lucide-react';
import { authAPI } from '@/services/api';

interface SecretQuestion {
  id: number;
  question_text: string;
}

const AuthPage = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerStep, setRegisterStep] = useState(1);
  const [forgotStep, setForgotStep] = useState(1); // NEW: Forgot password steps
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [secretQuestions, setSecretQuestions] = useState<SecretQuestion[]>([]);
  const [userSecretQuestion, setUserSecretQuestion] = useState<string>(''); // NEW: User's specific question
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    remember: false
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthday: '',
    secretQuestionId: 0,
    secretAnswer: '',
    agreeTerms: false
  });

  const [forgotPasswordData, setForgotPasswordData] = useState({
    username: '',
    secretAnswer: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const passwordRequirements = [
    { text: 'At least 6 characters', met: registerData.password.length >= 6 },
    { text: 'Contains uppercase', met: /[A-Z]/.test(registerData.password) },
    { text: 'Contains lowercase', met: /[a-z]/.test(registerData.password) },
    { text: 'Contains number', met: /[0-9]/.test(registerData.password) }
  ];

  const forgotPasswordRequirements = [
    { text: 'At least 6 characters', met: forgotPasswordData.newPassword.length >= 6 },
    { text: 'Contains uppercase', met: /[A-Z]/.test(forgotPasswordData.newPassword) },
    { text: 'Contains lowercase', met: /[a-z]/.test(forgotPasswordData.newPassword) },
    { text: 'Contains number', met: /[0-9]/.test(forgotPasswordData.newPassword) }
  ];

  // Fetch secret questions on component mount
  useEffect(() => {
    const fetchSecretQuestions = async () => {
      try {
        const response = await fetch('/api/auth/secret-question');
        if (response.ok) {
          const data = await response.json();
          setSecretQuestions(data.questions);
        }
      } catch (error) {
        console.error('Failed to fetch secret questions:', error);
      }
    };

    fetchSecretQuestions();
  }, []);

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(loginData.username, loginData.password);

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify({
          ...response.data.user,
          isLoggedIn: true
        }));
        
        window.location.href = '/dashboard';
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.birthday || !registerData.secretQuestionId || !registerData.secretAnswer) {
      setError('Please fill in all required fields');
      return;
    }

    if (registerData.username.length > 13) {
      setError('Username must be 13 characters or less');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!registerData.agreeTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        birthday: registerData.birthday,
        secretQuestionId: registerData.secretQuestionId,
        secretAnswer: registerData.secretAnswer
      });

      if (response.ok) {
        setTimeout(() => {
          setLoginData({
            username: registerData.username,
            password: registerData.password,
            remember: false
          });
          setCurrentView('login');
          setRegisterStep(1);
          handleLogin();
        }, 1000);
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle forgot password step 1 (username verification)
  const handleForgotStep1 = async () => {
    if (!forgotPasswordData.username) {
      setError('Please enter your username');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if user exists and has secret question
      const response = await fetch(`/api/auth/secret-question/${encodeURIComponent(forgotPasswordData.username)}`);
      const data = await response.json();

      if (response.ok && data.hasSecretQuestion) {
        setUserSecretQuestion(data.questionText);
        setForgotStep(2);
      } else {
        setError('Username not found or no security question set up');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle forgot password step 2 (security question verification)
  const handleForgotStep2 = async () => {
    if (!forgotPasswordData.secretAnswer) {
      setError('Please answer the security question');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify the answer by attempting a dummy reset with empty password
      const response = await fetch('/api/auth/verify-security-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: forgotPasswordData.username,
          secretAnswer: forgotPasswordData.secretAnswer
        }),
      });

      if (response.ok) {
        setForgotStep(3);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Incorrect security answer');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle forgot password step 3 (set new password)
  const handleForgotStep3 = async () => {
    if (!forgotPasswordData.newPassword || !forgotPasswordData.confirmNewPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    if (forgotPasswordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: forgotPasswordData.username,
          secretAnswer: forgotPasswordData.secretAnswer,
          newPassword: forgotPasswordData.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message + '\n\n' + (data.warning || ''));
        // Reset forgot password flow
        setCurrentView('login');
        setForgotStep(1);
        setForgotPasswordData({
          username: '',
          secretAnswer: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setUserSecretQuestion('');
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (registerStep === 1) {
      if (!registerData.username || !registerData.email) {
        setError('Please fill in username and email');
        return;
      }
      if (registerData.username.length > 13) {
        setError('Username must be 13 characters or less');
        return;
      }
    } else if (registerStep === 2) {
      if (!registerData.password || !registerData.confirmPassword) {
        setError('Please fill in both password fields');
        return;
      }
      if (registerData.password !== registerData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (registerData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
    } else if (registerStep === 3) {
      // FIXED: Only check for security question fields in Step 3
      if (!registerData.secretQuestionId || !registerData.secretAnswer) {
        setError('Please select a security question and provide an answer');
        return;
      }
    } else if (registerStep === 4) {
      // Birthday validation moved to Step 4 where it belongs
      if (!registerData.birthday) {
        setError('Please enter your birthday');
        return;
      }
    }
    
    setError('');
    setRegisterStep(registerStep + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setRegisterStep(registerStep - 1);
  };

  // NEW: Forgot password navigation
  const handleForgotPrevStep = () => {
    setError('');
    if (forgotStep === 1) {
      setCurrentView('login');
      setForgotStep(1);
      setForgotPasswordData({
        username: '',
        secretAnswer: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      setUserSecretQuestion('');
    } else {
      setForgotStep(forgotStep - 1);
    }
  };

  const selectedSecretQuestion = secretQuestions.find(q => q.id === registerData.secretQuestionId);

  return (
    <div className="min-h-screen relative overflow-hidden flex">
      {/* Left Side - Enhanced Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-110 transition-transform duration-[30s] ease-out blur-sm"
          >
            <source src="/assets/bg.webm" type="video/webm" />
            <Image
              src="/assets/test.jpg"
              alt="Background Fallback"
              fill
              className="object-cover scale-110 transition-transform duration-[30s] ease-out"
              priority
              quality={100}
            />
          </video>
          <div className="absolute inset-0 bg-orange-600/50" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="relative mb-12 group">
            <div className="absolute inset-0 bg-white/10 rounded-3xl blur-2xl transform group-hover:scale-110 transition-transform duration-500" />
            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              <Image 
                src="/assets/MapleKaede.png" 
                alt="MapleKaede" 
                width={320} 
                height={160} 
                className="drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">
              {currentView === 'register' ? (
                <span className="animate-fadeInUp">Join Our Adventure</span>
              ) : currentView === 'forgot' ? (
                <span className="animate-fadeInUp">Reset Password</span>
              ) : (
                <span className="animate-fadeInUp">Welcome Back</span>
              )}
            </h1>
            <p className="text-2xl text-white font-bold max-w-lg mx-auto drop-shadow-lg leading-relaxed">
              {currentView === 'register' 
                ? 'Create your account and begin your journey in the world of MapleStory'
                : currentView === 'forgot'
                ? forgotStep === 1 
                  ? 'Enter your username to begin password recovery'
                  : forgotStep === 2
                  ? 'Answer your security question to verify your identity'
                  : 'Set your new password and secure your account'
                : 'Log in to continue your epic adventure with thousands of players worldwide'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Enhanced Auth Forms */}
      <div className="w-full lg:w-1/2 relative bg-gray-50">
        <a 
          href="/" 
          className="absolute top-8 left-8 z-20 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 text-gray-700 hover:text-orange-500 hover:bg-white hover:shadow-lg transition-all duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Home</span>
        </a>

        <div className="lg:hidden absolute top-8 right-8 z-20">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 shadow-lg">
            <Image 
              src="/assets/MapleKaede.png" 
              alt="MapleKaede" 
              width={120} 
              height={60} 
              className="object-contain"
            />
          </div>
        </div>

        <div className="min-h-screen flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-md">
            {/* Enhanced Tab Switcher */}
            {currentView !== 'forgot' && (
              <div className="flex mb-10 bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-xl border border-gray-200/50">
                <button
                  onClick={() => {
                    setCurrentView('login');
                    setError('');
                  }}
                  className={`flex-1 py-4 px-8 rounded-2xl font-black text-lg transition-all duration-500 relative overflow-hidden ${
                    currentView === 'login' 
                      ? 'bg-orange-500 text-white shadow-xl transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <span className="relative z-10">Login</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('register');
                    setError('');
                    setRegisterStep(1);
                  }}
                  className={`flex-1 py-4 px-8 rounded-2xl font-black text-lg transition-all duration-500 relative overflow-hidden ${
                    currentView === 'register' 
                      ? 'bg-orange-500 text-white shadow-xl transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <span className="relative z-10">Register</span>
                </button>
              </div>
            )}

            {/* Enhanced Error Message */}
            {error && (
              <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <p className="text-red-700 font-bold">{error}</p>
                </div>
              </div>
            )}

            {/* Forms Container */}
            <div className="relative overflow-hidden min-h-[400px]">
              {/* LOGIN FORM */}
              {currentView === 'login' && (
                <div className="animate-fadeIn">
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
                    <div className="text-center mb-6">
                      <h2 className="text-3xl font-black text-gray-800 mb-2">Welcome back!</h2>
                      <p className="text-gray-600 font-medium">Please enter your details to login</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
                      <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                            <User className="w-3 h-3 text-orange-600" />
                          </div>
                          <input
                            type="text"
                            value={loginData.username}
                            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                            placeholder="Enter your username"
                            maxLength={13}
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                            <Lock className="w-3 h-3 text-orange-600" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={loginData.password}
                            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                            className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={loginData.remember}
                            onChange={(e) => setLoginData({...loginData, remember: e.target.checked})}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-0 border-2 border-gray-300" 
                          />
                          <span className="text-sm text-gray-700 font-medium group-hover:text-orange-600 transition-colors">Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentView('forgot');
                            setForgotStep(1);
                            setError('');
                          }}
                          className="text-sm text-orange-500 hover:text-orange-600 transition-colors font-bold"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !loginData.username || !loginData.password}
                        className="w-full py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                            Logging in...
                          </>
                        ) : (
                          'Login'
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* FORGOT PASSWORD FORM - NEW 3-STEP DESIGN */}
              {currentView === 'forgot' && (
                <div className="animate-fadeIn">
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
                    <div className="text-center mb-6">
                      <h2 className="text-3xl font-black text-gray-800 mb-2">Reset Password</h2>
                      <p className="text-gray-600 font-medium">Step {forgotStep} of 3</p>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(forgotStep / 3) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Step 1: Username */}
                    {forgotStep === 1 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleForgotStep1(); }} className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-bold text-gray-700">Enter Your Username</h3>
                          <p className="text-sm text-gray-500">We'll check if you have a security question set up</p>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center group-focus-within:bg-red-200 transition-colors">
                              <User className="w-3 h-3 text-red-600" />
                            </div>
                            <input
                              type="text"
                              value={forgotPasswordData.username}
                              onChange={(e) => setForgotPasswordData({...forgotPasswordData, username: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Enter your username"
                              maxLength={13}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleForgotPrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !forgotPasswordData.username}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                Continue
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 2: Security Question */}
                    {forgotStep === 2 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleForgotStep2(); }} className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-bold text-gray-700">Answer Security Question</h3>
                          <p className="text-sm text-gray-500">Please answer the question you set during registration</p>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-blue-800 text-sm">Your Security Question:</p>
                              <p className="text-blue-700 font-medium">{userSecretQuestion}</p>
                            </div>
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center group-focus-within:bg-red-200 transition-colors">
                              <Shield className="w-3 h-3 text-red-600" />
                            </div>
                            <input
                              type="text"
                              value={forgotPasswordData.secretAnswer}
                              onChange={(e) => setForgotPasswordData({...forgotPasswordData, secretAnswer: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Enter your answer"
                              autoFocus
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">This is case-insensitive, so don't worry about capitalization</p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleForgotPrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !forgotPasswordData.secretAnswer}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                Verify Answer
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 3: New Password */}
                    {forgotStep === 3 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleForgotStep3(); }} className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-bold text-gray-700">Set New Password</h3>
                          <p className="text-sm text-gray-500">Choose a strong password for your account</p>
                        </div>

                        {/* Important Security Notice */}
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-yellow-800 text-sm">🔒 Security Notice</p>
                              <p className="text-yellow-700 text-sm">Your PIN and PIC will be reset for security. You'll need to set them up again when you log into the game.</p>
                            </div>
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center group-focus-within:bg-red-200 transition-colors">
                              <Key className="w-3 h-3 text-red-600" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={forgotPasswordData.newPassword}
                              onChange={(e) => setForgotPasswordData({...forgotPasswordData, newPassword: e.target.value})}
                              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Enter new password"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>

                          {forgotPasswordData.newPassword && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="grid grid-cols-2 gap-2">
                                {forgotPasswordRequirements.map((req, index) => (
                                  <div key={index} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className={`text-xs font-medium ${req.met ? 'text-green-600' : 'text-gray-500'}`}>{req.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center group-focus-within:bg-red-200 transition-colors">
                              <Lock className="w-3 h-3 text-red-600" />
                            </div>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={forgotPasswordData.confirmNewPassword}
                              onChange={(e) => setForgotPasswordData({...forgotPasswordData, confirmNewPassword: e.target.value})}
                              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Confirm your new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          {forgotPasswordData.confirmNewPassword && forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword && (
                            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                              <div className="text-xs text-red-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full block" />
                                Passwords do not match
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleForgotPrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !forgotPasswordData.newPassword || !forgotPasswordData.confirmNewPassword || forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              <>
                                Reset Password
                                <Check className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* REGISTER FORM */}
              {currentView === 'register' && (
                <div className="animate-fadeIn">
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
                    <div className="text-center mb-6">
                      <h2 className="text-3xl font-black text-gray-800 mb-2">Create Account</h2>
                      <p className="text-gray-600 font-medium">Step {registerStep} of 4</p>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(registerStep / 4) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Step 1: Basic Info */}
                    {registerStep === 1 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-bold text-gray-700">Basic Information</h3>
                          <p className="text-sm text-gray-500">Let's start with your username and email</p>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <User className="w-3 h-3 text-orange-600" />
                            </div>
                            <input
                              type="text"
                              value={registerData.username}
                              onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Choose a username (max 13 chars)"
                              maxLength={13}
                              autoFocus
                            />
                            <div className="text-xs text-gray-500 mt-1 font-medium">
                              {registerData.username.length}/13 characters
                            </div>
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <Mail className="w-3 h-3 text-orange-600" />
                            </div>
                            <input
                              type="email"
                              value={registerData.email}
                              onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="your@email.com"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                          Next Step
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    )}

                    {/* Step 2: Password */}
                    {registerStep === 2 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-bold text-gray-700">Secure Your Account</h3>
                          <p className="text-sm text-gray-500">Create a strong password</p>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <Lock className="w-3 h-3 text-orange-600" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={registerData.password}
                              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Create a strong password"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          
                          {registerData.password && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="grid grid-cols-2 gap-2">
                                {passwordRequirements.map((req, index) => (
                                  <div key={index} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className={`text-xs font-medium ${req.met ? 'text-green-600' : 'text-gray-500'}`}>{req.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <Lock className="w-3 h-3 text-orange-600" />
                            </div>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={registerData.confirmPassword}
                              onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                              placeholder="Confirm your password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                              <div className="text-xs text-red-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full block" />
                                Passwords do not match
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            Next Step
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 3: Security Question */}
                    {registerStep === 3 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-bold text-gray-700">Security Question</h3>
                          <p className="text-sm text-gray-500">This will help you recover your password if needed</p>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Choose a Security Question</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <HelpCircle className="w-3 h-3 text-orange-600" />
                            </div>
                            <select
                              value={registerData.secretQuestionId}
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                console.log('Selected question ID:', selectedId); // Debug log
                                setRegisterData({...registerData, secretQuestionId: selectedId});
                              }}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                              autoFocus
                            >
                              <option value={0}>Select a security question...</option>
                              {secretQuestions.map((question) => (
                                <option key={question.id} value={question.id}>
                                  {question.question_text}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {selectedSecretQuestion && (
                          <div className="group">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                                <Shield className="w-3 h-3 text-orange-600" />
                              </div>
                              <input
                                type="text"
                                value={registerData.secretAnswer}
                                onChange={(e) => setRegisterData({...registerData, secretAnswer: e.target.value})}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 placeholder-gray-400 font-medium"
                                placeholder="Enter your answer"
                                maxLength={255}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Remember this answer - you'll need it to reset your password</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            Next Step
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 4: Final Details */}
                    {registerStep === 4 && (
                      <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-6">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-bold text-gray-700">Almost Done!</h3>
                          <p className="text-sm text-gray-500">Just a few more details</p>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Birthday</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center group-focus-within:bg-orange-200 transition-colors">
                              <Calendar className="w-3 h-3 text-orange-600" />
                            </div>
                            <input
                              type="date"
                              value={registerData.birthday}
                              onChange={(e) => setRegisterData({...registerData, birthday: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input 
                            type="checkbox" 
                            checked={registerData.agreeTerms}
                            onChange={(e) => setRegisterData({...registerData, agreeTerms: e.target.checked})}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-0 border-2 border-gray-300 mt-0.5" 
                          />
                          <label className="text-sm text-gray-700 leading-relaxed font-medium">
                            I agree to the <a href="#" className="text-orange-500 hover:text-orange-600 font-bold">Terms of Service</a> and <a href="#" className="text-orange-500 hover:text-orange-600 font-bold">Privacy Policy</a>
                          </label>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !registerData.agreeTerms || !registerData.birthday}
                            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <span className="relative z-10">
                              {isLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Creating Account...
                                </>
                              ) : (
                                <>
                                  Create Account
                                  <Check className="w-4 h-4" />
                                </>
                              )}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default AuthPage;