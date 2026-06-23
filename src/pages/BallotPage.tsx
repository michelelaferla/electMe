import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {useEffect, useMemo, useState} from 'react';
import {getCandidatesForElection, submitBallot} from '../lib/api';
import type {Candidate, Election} from '../types/domain';
import {SortableCandidate} from '../components/SortableCandidate';

type Props = { election: Election; onDone: () => void };

export function BallotPage({ election, onDone }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 6}}),
        useSensor(TouchSensor, {activationConstraint: {delay: 120, tolerance: 8}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    useEffect(() => {
        getCandidatesForElection(election.election_id)
            .then(rows => {
                setCandidates(rows);
                setSelectedIds([]);
            })
            .catch(err => setError(err.message));
    }, [election.election_id]);

  const selected = selectedIds.map(id => candidates.find(c => c.candidate_id === id)).filter(Boolean) as Candidate[];
  const excluded = candidates.filter(c => !selectedIds.includes(c.candidate_id));
  const partyGroups = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    candidates.forEach(c => map.set(c.party_name, [...(map.get(c.party_name) || []), c]));
    return [...map.entries()];
  }, [candidates]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedIds(items => arrayMove(items, items.indexOf(Number(active.id)), items.indexOf(Number(over.id))));
  }

  function toggle(id: number) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function submit() {
    if (!selectedIds.length) { setError('Select at least one candidate before submitting.'); return; }
    if (!confirm('Submit final ballot? You cannot change it afterwards.')) return;
    setSubmitting(true); setError(null);
    try {
      await submitBallot(election.election_id, selectedIds.map((candidate_id, i) => ({ candidate_id, preference: i + 1 })));
      onDone();
    } catch (err: any) { setError(err.message); }
    setSubmitting(false);
  }

    return <main className="page ballotPage">
        <header className="topbar">
            <div><h1>{election.election_name}</h1><p>Candidates start unchosen. Add only the candidates you want to vote
                for, then drag your chosen candidates into preference order.</p></div>
            <button type="button" onClick={onDone}>Back</button>
        </header>
    {error && <p className="error">{error}</p>}
    <section className="layout"><aside className="card partyList"><h2>Candidates by party</h2>{partyGroups.map(([party, rows]) => <div className="partyGroup" key={party}><h3>{rows[0]?.party_logo_url && <img src={rows[0].party_logo_url} alt=""/>}{party}</h3>{rows.sort((a,b) => a.surname.localeCompare(b.surname)).map(c => <p key={c.candidate_id}>{c.surname}, {c.first_name}</p>)}</div>)}</aside>
        <section className="card voteList"><h2>Your chosen preferences</h2>{selected.length === 0 &&
            <p className="emptyState">No candidates chosen yet. Tap Choose below to add candidates to your
                ballot.</p>}<DndContext sensors={sensors} collisionDetection={closestCenter}
                                        onDragEnd={onDragEnd}><SortableContext items={selectedIds}
                                                                               strategy={verticalListSortingStrategy}>{selected.map((c, i) =>
            <SortableCandidate key={c.candidate_id} candidate={c} index={i} selected
                               onToggle={() => toggle(c.candidate_id)}/>)}</SortableContext></DndContext>
            {excluded.length > 0 && <><h2>Available candidates</h2>{excluded.map((c, i) => <SortableCandidate
                key={c.candidate_id} candidate={c} index={i} selected={false}
                onToggle={() => toggle(c.candidate_id)}/>)}</>}
            <button type="button" className="submit" disabled={submitting || selectedIds.length === 0}
                    onClick={submit}>{submitting ? 'Submitting…' : selectedIds.length === 0 ? 'Choose at least one candidate' : 'Submit final ballot'}</button>
        </section>
    </section>
  </main>;
}
