const BASE_URL = import.meta.env.VITE_CHAT_API_URL as string;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  smsBody?: string;
}

export interface AdminSession {
  id: string;
  created_at: string;
  last_message_at: string | null;
  message_count: number;
  last_preview: string;
}

export interface AdminSessionDetail extends AdminSession {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
}

export async function sendChatMessage(
  sessionId: string,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  return res.json() as Promise<ChatResponse>;
}

export async function fetchAdminSessions(password: string): Promise<AdminSession[]> {
  const res = await fetch(`${BASE_URL}/api/admin/sessions`, {
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json() as Promise<AdminSession[]>;
}

export async function fetchAdminSession(
  id: string,
  password: string
): Promise<AdminSessionDetail> {
  const res = await fetch(`${BASE_URL}/api/admin/sessions/${id}`, {
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json() as Promise<AdminSessionDetail>;
}

export async function deleteAdminSession(id: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/sessions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
}
