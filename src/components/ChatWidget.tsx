import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendChatMessage, type ChatMessage } from '@/lib/chatApi';

function getOrCreateSessionId(): string {
  const key = 'chat_session_id';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [smsBody, setSmsBody] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateSessionId();
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(sessionIdRef.current, updatedMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.smsBody) setSmsBody(response.smsBody);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Zamknij czat' : 'Otwórz czat'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Czat z asystentem"
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-bold flex flex-col"
          style={{ height: '480px' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="font-display font-semibold text-sm">Asystent Dr Koło</div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Zamknij"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-8">
                Cześć! Jak mogę pomóc z Twoim rowerem?
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-3 py-2 rounded-lg text-sm text-muted-foreground animate-pulse">
                  ...
                </div>
              </div>
            )}
            {smsBody && (
              <div className="flex justify-center pt-2">
                <a
                  href={`sms:+48511061221?body=${encodeURIComponent(smsBody)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Wyślij SMS do serwisu
                </a>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Napisz wiadomość..."
              disabled={isLoading}
              aria-label="Wiadomość"
              className="flex-1 text-sm bg-secondary border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Wyślij"
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
