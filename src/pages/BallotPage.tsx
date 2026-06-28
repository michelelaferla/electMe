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
import {useLanguage} from '../i18n/LanguageContext';

type Props = { election: Election & { Election_ID?: number }; onBack: () => void; onSubmitted: () => void };

type PartyCandidateGroup = {
  partyId: number;
  partyName: string;
  partyLogoUrl?: string | null;
  candidates: Candidate[];
};

function compareCandidates(a: Candidate, b: Candidate) {
  return a.surname.localeCompare(b.surname) || a.first_name.localeCompare(b.first_name);
}

export function BallotPage({election, onBack, onSubmitted}: Props) {
  const {t} = useLanguage();
  const electionId = Number(election.election_id ?? election.Election_ID);
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
    getCandidatesForElection(electionId)
        .then(rows => {
          setCandidates(rows);
          setSelectedIds([]);
        })
        .catch(err => setError(err.message));
  }, [electionId]);

  const selected = useMemo<Candidate[]>(() => {
    return selectedIds
        .map(id => candidates.find(candidate => candidate.candidate_id === id))
        .filter((candidate): candidate is Candidate => Boolean(candidate));
  }, [candidates, selectedIds]);

  const availableGroups = useMemo<PartyCandidateGroup[]>(() => {
    const selectedSet = new Set(selectedIds);
    const grouped = new Map<number, PartyCandidateGroup>();

    candidates
        .filter(candidate => !selectedSet.has(candidate.candidate_id))
        .forEach(candidate => {
          const group = grouped.get(candidate.party_id) ?? {
            partyId: candidate.party_id,
            partyName: candidate.party_name || t('ballot.independent'),
            partyLogoUrl: candidate.party_logo_url,
            candidates: []
          };

          group.candidates.push(candidate);
          grouped.set(candidate.party_id, group);
        });

    return [...grouped.values()]
        .map(group => ({...group, candidates: [...group.candidates].sort(compareCandidates)}))
        .sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [candidates, selectedIds, t]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedIds(items => arrayMove(items, items.indexOf(Number(active.id)), items.indexOf(Number(over.id))));
  }

  function toggle(id: number) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function submit() {
    if (!Number.isFinite(electionId)) {
      setError('Missing election ID. Please go back and choose the election again.');
      return;
    }
    if (!selectedIds.length) {
      setError(t('ballot.selectOneError'));
      return;
    }
    if (!confirm(t('ballot.confirmSubmit'))) return;
    setSubmitting(true); setError(null);
    try {
      await submitBallot(electionId, selectedIds.map((candidate_id, i) => ({candidate_id, preference: i + 1})));
      onSubmitted();
    } catch (err: any) { setError(err.message); }
    setSubmitting(false);
  }

  return <main className="page ballotPage">
    <header className="topbar">
      <div>
        <h1>{election.election_name}</h1>
        <p>{t('ballot.instructions')}</p>
      </div>
      <button type="button" onClick={onBack}>{t('ballot.back')}</button>
    </header>

    {error && <p className="error">{error}</p>}

    <section className="card voteList">
      <section className="chosenSection">
        <h2>{t('ballot.chosenPreferences')}</h2>
        {selected.length === 0 && <p className="emptyState">{t('ballot.noChosen')}</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
            {selected.map((c, i) => <SortableCandidate key={c.candidate_id} candidate={c} index={i} selected
                                                       onToggle={() => toggle(c.candidate_id)}/>)}
          </SortableContext>
        </DndContext>
      </section>

      <section className="availableSection">
        <h2>{t('ballot.availableCandidates')}</h2>
        {availableGroups.length === 0 && <p className="emptyState">{t('ballot.allAdded')}</p>}
        {availableGroups.map(group => (
            <section className="availablePartyGroup" key={group.partyId}>
              <header className="partyHeader">
                {group.partyLogoUrl && <img src={group.partyLogoUrl} alt=""/>}
                <div>
                  <h3>{group.partyName}</h3>
                  <span>{group.candidates.length} {group.candidates.length === 1 ? t('ballot.candidate') : t('ballot.candidates')}</span>
                </div>
              </header>
              {group.candidates.map((c, i) => <SortableCandidate key={c.candidate_id} candidate={c} index={i}
                                                                 selected={false}
                                                                 onToggle={() => toggle(c.candidate_id)}/>)}
            </section>
        ))}
      </section>

      <button type="button" className="submit" disabled={submitting || selectedIds.length === 0}
              onClick={submit}>{submitting ? t('ballot.submitting') : selectedIds.length === 0 ? t('ballot.chooseAtLeastOne') : t('ballot.submitFinal')}</button>
    </section>
  </main>;
}
