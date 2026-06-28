import {useEffect, useState} from 'react';
import {getMyElections, getMyProfile} from '../lib/api';
import type {Election, VoterProfile} from '../types/domain';
import {supabase} from '../lib/supabase';
import {useLanguage} from '../i18n/LanguageContext';

type Props = { onSelect: (election: Election) => void };

export function ElectionsPage({ onSelect }: Props) {
    const {t} = useLanguage();
  const [profile, setProfile] = useState<VoterProfile | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([getMyProfile(), getMyElections()]).then(([p, e]) => {
            setProfile(p);
            setElections(e);
        }).catch(err => setError(err.message));
    }, []);

    return <main className="page">
        <header className="topbar">
            <div><h1>{t('elections.title')}</h1><p>{profile?.full_name}</p></div>
            <button type="button" onClick={() => supabase.auth.signOut()}>{t('elections.signOut')}</button>
        </header>
    {error && <p className="error">{error}</p>}
        <section className="grid">
            {elections.map(e => {
                const electionAny = e as any;
                const id = electionAny.election_id ?? electionAny.Election_ID;
                const name = electionAny.election_name ?? electionAny.Election_Name;

                return <button
                    key={id}
                    className="electionCard"
                    onClick={() => onSelect(e)}
                >
                    <strong>{name}</strong>
                    <span>{t('elections.availableToVote')}</span>
                </button>;
            })}
        </section>
        {!elections.length && !error && <p className="emptyState">{t('elections.noneAvailable')}</p>}
  </main>;
}
