export interface User {
  id: string;
  email: string;
  role: 'customer' | 'business' | 'admin';
}