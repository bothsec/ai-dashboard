export interface User {
  id: number;
  username: string;
  role: string;
  created_at: number;
  last_login: number | null;
}

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  created_at: number;
  updated_at: number;
}