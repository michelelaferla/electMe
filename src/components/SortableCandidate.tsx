import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { Candidate } from '../types/domain';

type Props = { candidate: Candidate; index: number; selected: boolean; onToggle: () => void };

export function SortableCandidate({ candidate, index, selected, onToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.candidate_id, disabled: !selected });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const name = `${candidate.first_name} ${candidate.surname}`;

  return (
    <article ref={setNodeRef} style={style} className={`candidate ${selected ? 'selected' : 'excluded'} ${isDragging ? 'dragging' : ''}`}>
      <button className="dragHandle" aria-label={`Move ${name}`} {...attributes} {...listeners} disabled={!selected}><GripVertical size={20}/></button>
      <img className="avatar" src={candidate.photo_url || '/candidate-placeholder.svg'} alt="" />
      <div className="candidateBody">
        <strong>{selected ? `${index + 1}. ` : ''}{name}</strong>
        <span>{candidate.profession || 'Profession not provided'}</span>
        <small>{candidate.address || 'Address not provided'}</small>
      </div>
      <button className="toggleBtn" onClick={onToggle}>{selected ? <X size={18}/> : 'Add'}</button>
    </article>
  );
}
