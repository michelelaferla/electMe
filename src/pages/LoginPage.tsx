import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return <main className="centerPage"><form className="card login" onSubmit={login}>
    <h1>Election Login</h1>
    <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>
    <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" required /></label>
    {error && <p className="error">{error}</p>}
    <button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
  </form></main>;
}
