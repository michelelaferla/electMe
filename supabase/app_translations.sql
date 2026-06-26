-- Supabase-backed multilingual text for the React application.
-- Run this once in Supabase SQL Editor. The React app reads this table using the anon key.

create table if not exists public.app_translations (
  language_code text not null check (language_code in ('en', 'mt')),
  text_key text not null,
  text_value text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (language_code, text_key)
);

alter table public.app_translations enable row level security;

drop policy if exists "Anyone can read active app translations" on public.app_translations;
create policy "Anyone can read active app translations"
  on public.app_translations
  for select
  using (is_active = true);

insert into public.app_translations (language_code, text_key, text_value) values
('en','app.loading','Loading…'),
('en','accessibility.highContrast.enable','High contrast'),
('en','accessibility.highContrast.disable','Standard contrast'),
('en','accessibility.highContrast.enableLabel','Enable high contrast mode'),
('en','accessibility.highContrast.disableLabel','Disable high contrast mode'),
('en','language.label','Language'),
('en','language.english','English'),
('en','language.maltese','Maltese'),
('en','login.title','Election Login'),
('en','login.email','Email'),
('en','login.password','Password'),
('en','login.signIn','Sign in'),
('en','login.signingIn','Signing in…'),
('en','elections.title','Choose election'),
('en','elections.signOut','Sign out'),
('en','elections.alreadyVoted','Already voted'),
('en','elections.availableToVote','Available to vote'),
('en','elections.noneAvailable','No valid elections are currently available.'),
('en','ballot.instructions','Candidates start unchosen. Add only the candidates you want to vote for, then drag your chosen candidates into preference order.'),
('en','ballot.back','Back'),
('en','ballot.chosenPreferences','Your chosen preferences'),
('en','ballot.noChosen','No candidates chosen yet. Tap Choose below to add candidates to your ballot.'),
('en','ballot.availableCandidates','Available candidates'),
('en','ballot.allAdded','All candidates have been added to your ballot.'),
('en','ballot.candidate','candidate'),
('en','ballot.candidates','candidates'),
('en','ballot.independent','Independent / No party'),
('en','ballot.professionMissing','Profession not provided'),
('en','ballot.addressMissing','Address not provided'),
('en','ballot.choose','Choose'),
('en','ballot.remove','Remove'),
('en','ballot.moveCandidate','Move {name}'),
('en','ballot.removeCandidate','Remove {name} from ballot'),
('en','ballot.chooseCandidate','Choose {name}'),
('en','ballot.selectOneError','Select at least one candidate before submitting.'),
('en','ballot.confirmSubmit','Submit final ballot? You cannot change it afterwards.'),
('en','ballot.submitting','Submitting…'),
('en','ballot.chooseAtLeastOne','Choose at least one candidate'),
('en','ballot.submitFinal','Submit final ballot'),
('mt','app.loading','Qed jitgħabba…'),
('mt','accessibility.highContrast.enable','Kuntrast għoli'),
('mt','accessibility.highContrast.disable','Kuntrast standard'),
('mt','accessibility.highContrast.enableLabel','Ixgħel il-modalità ta’ kuntrast għoli'),
('mt','accessibility.highContrast.disableLabel','Itfi l-modalità ta’ kuntrast għoli'),
('mt','language.label','Lingwa'),
('mt','language.english','Ingliż'),
('mt','language.maltese','Malti'),
('mt','login.title','Dħul għall-Elezzjoni'),
('mt','login.email','Email'),
('mt','login.password','Password'),
('mt','login.signIn','Idħol'),
('mt','login.signingIn','Qed tidħol…'),
('mt','elections.title','Agħżel elezzjoni'),
('mt','elections.signOut','Oħroġ'),
('mt','elections.alreadyVoted','Diġà vvutajt'),
('mt','elections.availableToVote','Disponibbli biex tivvota'),
('mt','elections.noneAvailable','Bħalissa m’hemm l-ebda elezzjoni valida disponibbli.'),
('mt','ballot.instructions','Il-kandidati jibdew mhux magħżula. Żid biss il-kandidati li trid tivvota għalihom, imbagħad ġib il-kandidati magħżula fl-ordni tal-preferenza tiegħek.'),
('mt','ballot.back','Lura'),
('mt','ballot.chosenPreferences','Il-preferenzi magħżula tiegħek'),
('mt','ballot.noChosen','Għadek ma għażilt l-ebda kandidat. Agħfas Agħżel hawn taħt biex iżżid kandidati mal-vot tiegħek.'),
('mt','ballot.availableCandidates','Kandidati disponibbli'),
('mt','ballot.allAdded','Il-kandidati kollha ġew miżjuda mal-vot tiegħek.'),
('mt','ballot.candidate','kandidat'),
('mt','ballot.candidates','kandidati'),
('mt','ballot.independent','Indipendenti / Bla partit'),
('mt','ballot.professionMissing','Professjoni mhux ipprovduta'),
('mt','ballot.addressMissing','Indirizz mhux ipprovdut'),
('mt','ballot.choose','Agħżel'),
('mt','ballot.remove','Neħħi'),
('mt','ballot.moveCandidate','Mexxi lil {name}'),
('mt','ballot.removeCandidate','Neħħi lil {name} mill-vot'),
('mt','ballot.chooseCandidate','Agħżel lil {name}'),
('mt','ballot.selectOneError','Agħżel mill-inqas kandidat wieħed qabel tissottometti.'),
('mt','ballot.confirmSubmit','Tissottometti l-vot finali? Ma tkunx tista’ tbiddlu wara.'),
('mt','ballot.submitting','Qed jiġi sottomess…'),
('mt','ballot.chooseAtLeastOne','Agħżel mill-inqas kandidat wieħed'),
('mt','ballot.submitFinal','Issottometti l-vot finali')
on conflict (language_code, text_key) do update
set text_value = excluded.text_value,
    is_active = true,
    updated_at = now();

notify pgrst, 'reload schema';
