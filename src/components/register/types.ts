export type RegistrationMode = 'create_org' | 'join_org' | 'individual';
export type OrganizationType = 'agency' | 'brand' | 'community';
export type UserRolePrimary = 'creator' | 'editor' | 'both';

export interface RegistrationData {
  // Step 1 - Access type
  registrationMode: RegistrationMode | null;
  
  // Step 2 - Profile type
  organizationType: OrganizationType | null;
  userRolePrimary: UserRolePrimary | null;
  
  // Step 3 - Basic data
  fullName: string;
  email: string;
  password: string;
  country: string;
  
  // Organization specific
  organizationName: string;
  organizationUsername: string;
  organizationCategory: string;
  
  // Join org specific
  inviteCode: string;
  joinLink: string;
  
  // Step 4 - Plan
  selectedPlan: 'starter' | 'growth' | 'scale' | null;
  
  // Step 5 - Talent access
  talentAccessAcknowledged: boolean;
}

export const initialRegistrationData: RegistrationData = {
  registrationMode: null,
  organizationType: null,
  userRolePrimary: null,
  fullName: '',
  email: '',
  password: '',
  country: '',
  organizationName: '',
  organizationUsername: '',
  organizationCategory: '',
  inviteCode: '',
  joinLink: '',
  selectedPlan: null,
  talentAccessAcknowledged: false,
};

export interface StepProps {
  data: RegistrationData;
  updateData: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}
