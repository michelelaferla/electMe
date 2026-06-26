import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {useLanguage} from '../i18n/LanguageContext';

export function LoginPage() {
    const {t} = useLanguage();
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
      <h1>{t('login.title')}</h1>
      <label>{t('login.email')}<input value={email} onChange={e => setEmail(e.target.value)} type="email"
                                      autoComplete="email" required/></label>
      <label>{t('login.password')}<input value={password} onChange={e => setPassword(e.target.value)} type="password"
                                         autoComplete="current-password" required/></label>
    {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? t('login.signingIn') : t('login.signIn')}</button>
  </form></main>;
}
