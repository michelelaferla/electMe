import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { BallotPage } from './pages/BallotPage';
import type { Election } from './types/domain';

export default function App() {
  const { user, loading } = useAuth();
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  if (loading) return <main className="centerPage">Loading…</main>;
  if (!user) return <LoginPage />;
  if (selectedElection) return <BallotPage election={selectedElection} onDone={() => setSelectedElection(null)} />;
  return <ElectionsPage onSelect={setSelectedElection} />;
}
