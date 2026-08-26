import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    try {
      if (isResettingPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('Password reset link sent to your email.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (isResettingPassword && err.code === 'auth/user-not-found') {
        setError('No account found with that email address.');
      } else if (
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential'
      ) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <div className="w-full max-w-sm bg-white dark:bg-[#1e1e1e] rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
          {isResettingPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-danger text-danger text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500 text-green-500 dark:text-green-400 text-sm rounded-lg text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-zinc-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                required
              />
            </div>
            {!isResettingPassword && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-zinc-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-primary text-white dark:text-[#121212] font-bold rounded-xl hover:bg-primaryHover transition flex items-center justify-center space-x-2"
          >
            {isResettingPassword ? <Mail className="w-5 h-5" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
            <span>{isResettingPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up')}</span>
          </button>
        </form>

        <div className="mt-6 flex flex-col space-y-3 text-center">
          {isLogin && !isResettingPassword && (
            <button
              type="button"
              onClick={() => {
                setIsResettingPassword(true);
                setError('');
                setSuccessMsg('');
              }}
              className="text-gray-500 dark:text-zinc-400 hover:text-primary transition text-sm font-medium"
            >
              Forgot Password?
            </button>
          )}

          {isResettingPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsResettingPassword(false);
                setError('');
                setSuccessMsg('');
              }}
              className="text-gray-500 dark:text-zinc-400 hover:text-primary transition text-sm font-medium"
            >
              Back to Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccessMsg('');
              }}
              className="text-gray-500 dark:text-zinc-400 hover:text-primary transition text-sm font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
