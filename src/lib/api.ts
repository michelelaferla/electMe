import {supabase} from './supabase';
import type {BallotPreference, Candidate, Election, VoterProfile} from '../types/domain';

export async function getMyProfile(): Promise<VoterProfile> {
  const {data, error} = await supabase.rpc('get_my_voter_profile').single();
  if (error) throw error;
  return data as VoterProfile;
}

export async function getMyElections(): Promise<Election[]> {
  const { data, error } = await supabase.rpc('get_my_valid_elections');
  if (error) throw error;
  return data as Election[];
}

export async function getCandidatesForElection(electionId: number): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc('get_candidates_for_my_district', { p_election_id: electionId });
  if (error) throw error;
  return data as Candidate[];
}

export async function submitBallot(electionId: number, preferences: BallotPreference[]) {
  const { data, error } = await supabase.rpc('submit_ballot', {
    p_election_id: electionId,
    p_preferences: preferences
  });
  if (error) throw error;
  return data;
}
