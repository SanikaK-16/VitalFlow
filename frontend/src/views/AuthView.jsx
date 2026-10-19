import React, { useState } from 'react';
import {
  Activity, Building2, Lock, Mail, Phone, MapPin,
  ShieldCheck, ArrowRight, Eye, EyeOff, User, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api, { setAuthToken } from '../api';

export default function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state - clean and empty for live presentation
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [signupData, setSignupData] = useState({
    hospital_name: '',
    reg_no: '',
    address: '',
    city: 'Pune',
    phone: '',
    admin_name: '',
    admin_email: '',
    password: ''
  });

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      const { access_token, user, hospital } = res.data;
      setAuthToken(access_token);
      onAuthSuccess({ token: access_token, user, hospital });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid hospital credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.registerHospital(signupData);
      const { access_token, user, hospital } = res.data;
      setAuthToken(access_token);
      onAuthSuccess({ token: access_token, user, hospital });
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Registration number or email may already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 antialiased selection:bg-blue-500 selection:text-white relative overflow-y-auto">
      {/* Background soft ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-4 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-3.5 py-1.5 rounded-xl shadow-md font-bold text-sm tracking-tight">
            <Activity className="w-4 h-4 text-blue-100" />
            <span>VitalFlow</span>
            <span className="text-[11px] bg-blue-700/80 px-2 py-0.5 rounded-md font-mono text-blue-100">Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Hospital Operations &amp; Resource Optimization
          </h1>
          <p className="text-xs text-slate-400">
            The right patient. The right bed. Right now.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden p-6 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 bg-slate-900/80 p-1 rounded-xl text-xs font-semibold border border-slate-700/60">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 rounded-lg transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hospital Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-2 rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register New Hospital
            </button>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* MODE 1: LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-medium">Hospital / Admin Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter official hospital email"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-medium">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Hospital Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: SIGN UP / REGISTER NEW HOSPITAL */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5 text-xs">
              <div className="bg-blue-950/40 border border-blue-900/60 p-2.5 rounded-xl">
                <span className="font-bold text-blue-200 block text-[11px]">Automated Department Provisioning</span>
                <span className="text-[10px] text-slate-400">
                  Instantly provisions emergency wards, ICU, HDU telemetry beds, and clinical staff profiles.
                </span>
              </div>

              {/* Hospital Details */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Hospital Name</label>
                    <input
                      type="text"
                      required
                      value={signupData.hospital_name}
                      onChange={(e) => setSignupData({ ...signupData, hospital_name: e.target.value })}
                      placeholder="e.g. Metro Lifecare Hospital"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Registration / License No.</label>
                    <input
                      type="text"
                      required
                      value={signupData.reg_no}
                      onChange={(e) => setSignupData({ ...signupData, reg_no: e.target.value })}
                      placeholder="e.g. MH-PUN-2026-101"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Facility Address</label>
                    <input
                      type="text"
                      value={signupData.address}
                      onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                      placeholder="Street / Area"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={signupData.city}
                      onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                      placeholder="City"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Emergency Desk Contact</label>
                  <input
                    type="text"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    placeholder="+91 20 2567 8900"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Admin / Physician Account Details */}
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                  Lead Physician / Administrator Credentials
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Doctor / Admin Name</label>
                    <input
                      type="text"
                      required
                      value={signupData.admin_name}
                      onChange={(e) => setSignupData({ ...signupData, admin_name: e.target.value })}
                      placeholder="e.g. Dr. Sunita Deshmukh"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      value={signupData.admin_email}
                      onChange={(e) => setSignupData({ ...signupData, admin_email: e.target.value })}
                      placeholder="doctor@hospital.org"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Password</label>
                  <input
                    type="password"
                    required
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    placeholder="Create a secure password"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Registering &amp; Provisioning Facility...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Register Hospital &amp; Open Portal</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security & Multi-Tenancy Assurance */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Multi-Tenant Data Isolation &amp; Cryptographic Storage</span>
        </div>
      </div>
    </div>
  );
}
