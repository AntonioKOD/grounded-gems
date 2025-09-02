export interface Experience {
  id: string;
  title: string;
  city: string;
  description?: string;
  media?: {
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    width?: number;
    height?: number;
    filesize?: number;
  };
  status: 'DRAFT' | 'PUBLISHED' | 'REJECTED';
  contestEligible: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  tags?: Array<{ tag: string }>;
  rating?: number;
  location?: {
    state?: string;
    country?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  metadata?: {
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    duration?: string;
    cost?: number;
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateExperienceInput {
  title: string;
  city: string;
  description?: string;
  media?: string; // Media ID
  status?: 'DRAFT' | 'PUBLISHED' | 'REJECTED';
  contestEligible?: boolean;
  tags?: Array<{ tag: string }>;
  rating?: number;
  location?: {
    state?: string;
    country?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  metadata?: {
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    duration?: string;
    cost?: number;
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
  };
}

export interface UpdateExperienceInput extends Partial<CreateExperienceInput> {
  id: string;
}

export interface ExperienceFilters {
  status?: 'DRAFT' | 'PUBLISHED' | 'REJECTED';
  contestEligible?: boolean;
  city?: string;
  owner?: string;
  tags?: string[];
  rating?: number;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
}

export interface ContestEligibleExperience extends Experience {
  contestEligible: true;
  status: 'PUBLISHED';
}
