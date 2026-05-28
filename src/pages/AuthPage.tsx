import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { YearOfStudy } from '../types';
import { DEPARTMENTS } from '../lib/departments';
import { useToast } from '../hooks/useToast';

export const AuthPage: React.FC = () => {
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration metadata states
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<YearOfStudy>('1st Year');
  const [section, setSection] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setSuccessMsg('Logged in successfully!');
      toast.success('Sign In Successful', 'Welcome back to SkillSaathi!');
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during sign in.';
      setErrorMsg(errMsg);
      toast.error('Sign In Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !department || !yearOfStudy) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const trimmedDept = department.trim();
    if (!trimmedDept) {
      setErrorMsg('Please enter a valid department.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            department: trimmedDept,
            year_of_study: yearOfStudy,
            section: section.trim() || null,
          },
        },
      });

      if (error) throw error;

      // Check if email confirmation is required (session might be null if email confirmation is enabled)
      if (data.user && !data.session) {
        const msg = 'Registration successful! Please check your campus email inbox to confirm your account.';
        setSuccessMsg(msg);
        toast.success('Registration Successful', 'Check your college email to verify your profile!');
      } else {
        setSuccessMsg('Account created and logged in successfully!');
        toast.success('Account Created', 'Welcome to SkillSaathi peer learning!');
      }

      // Reset registration inputs
      setFullName('');
      setDepartment('');
      setSection('');
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during registration.';
      setErrorMsg(errMsg);
      toast.error('Registration Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {mode === 'login' ? 'Sign in to SkillSaathi' : 'Create Campus Account'}
          </h2>
          <p className="text-sm text-slate-500">
            {mode === 'login' 
              ? 'Connect with your campus community today' 
              : 'Share your skills and study together'
            }
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
            <span className="font-semibold">Error:</span> {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="p-4 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200" role="alert">
            <span className="font-semibold">Success:</span> {successMsg}
          </div>
        )}

        {/* Action Form */}
        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campus Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg shadow-sm transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Split Grid for Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Campus Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Split Grid for Password and Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password (6+ chars) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="auth-departments-list"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Select or type department"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                />
                <datalist id="auth-departments-list">
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Year of study and Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Year of Study <span className="text-red-500">*</span>
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value as YearOfStudy)}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Section <span className="text-slate-450 text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Section A"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg shadow-sm border border-transparent transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="absolute px-3 bg-white text-xs text-slate-400 uppercase">Or</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 shadow-sm transition-colors duration-150"
        >
          {mode === 'login' ? 'Create Campus Account' : 'Sign in to Existing Account'}
        </button>
      </div>
    </div>
  );
};
