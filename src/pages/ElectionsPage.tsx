import {useEffect, useState} from 'react';
import {getMyElections, getMyProfile} from '../lib/api';
import type {Election, VoterProfile} from '../types/domain';
import {supabase} from '../lib/supabase';

type Props = { onSelect: (election: Election) => void };

export function ElectionsPage({ onSelect }: Props) {
  const [profile, setProfile] = useState<VoterProfile | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { Promise.all([getMyProfile(), getMyElections()]).then(([p, e]) => { setProfile(p); setElections(e); }).catch(err => setError(err.message)); }, []);

    return <main className="page">
        <header className="topbar">
            <div><h1>Choose election</h1><p>{profile?.full_name}</p></div>
            <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>
    {error && <p className="error">{error}</p>}
    <section className="grid">{elections.map(e => <button key={e.election_id} className="electionCard" disabled={e.has_voted} onClick={() => onSelect(e)}>
      <strong>{e.election_name}</strong><span>{e.has_voted ? 'Already voted' : 'Available to vote'}</span>
    </button>)}</section>
        {!elections.length && !error && <p className="emptyState">No valid elections are currently available.</p>}
  </main>;
}
