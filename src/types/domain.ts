export type VoterProfile = {
  voter_id: number;
  full_name: string;
  district_id: number;
};

export type Election = {
  election_id: number;
  election_name: string;
  election_type?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_valid: boolean;
  has_voted?: boolean;
};

export type Candidate = {
  candidate_id: number;
  first_name: string;
  surname: string;
  profession?: string | null;
  address?: string | null;
  photo_url?: string | null;
  party_id: number;
  party_name: string;
  party_logo_url?: string | null;
};

export type BallotPreference = {
  candidate_id: number;
  preference: number;
};
