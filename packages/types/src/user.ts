export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  role: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
  profileImageUrl: string | null;
  pushEnabled: boolean;
  onboardingCompletedAt: string | null;
}
