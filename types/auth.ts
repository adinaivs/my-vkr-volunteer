export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  role: 'volunteer' | 'organizer' | 'admin';
  status: 'active' | 'inactive' | 'blocked' | 'deleted';
  avatarUrl?: string;
  createdAt: Date;
}

export interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  city: string;
  role: 'volunteer' | 'organizer';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface ErrorResponse {
  error: string;
}
