import 'dotenv/config';
import express from 'express';
import { createGateway } from '@ai-sdk/gateway';
import { convertToModelMessages, pipeUIMessageStreamToResponse, streamText, toUIMessageStream, validateUIMessages } from 'ai';
const app = express();
const model = 'nvidia/nemotron-3.5-lightning-free';
app.use(express.json({ limit: '128kb' }));
app.get('/api/health', (_req, res) => res.json({ configured: Boolean(process.env['AI_GATEWAY_API_KEY']), model }));
app.post('/api/chat', async (req, res) => {
  if (!process.env['AI_GATEWAY_API_KEY']) {
    res.status(503).send('Brak AI_GATEWAY_API_KEY. Dodaj klucz Vercel AI Gateway w pliku app/.env.'); return;
  }
  try {
    const messages = await validateUIMessages({ messages: req.body.messages });
    if (!messages.length || messages.length > 60 || messages.some(m => !['user', 'assistant'].includes(m.role))) {
      res.status(400).send('Wyślij od 1 do 60 wiadomości użytkownika lub asystenta.'); return;
    }
    const gateway = createGateway({ apiKey: process.env['AI_GATEWAY_API_KEY'] });
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    const result = streamText({
      model: gateway(model), system: 'Odpowiadaj zwięźle i pomocnie po polsku, chyba że użytkownik prosi o inny język.',
      messages: await convertToModelMessages(messages), maxOutputTokens: 2048, abortSignal: abort.signal,
    });
    pipeUIMessageStreamToResponse({ response: res, stream: toUIMessageStream({ stream: result.stream,
      onError: () => 'AI Gateway nie zwrócił odpowiedzi. Sprawdź klucz, dostęp do modelu i limity konta Vercel.',
    }) });
  } catch { if (!res.headersSent) res.status(400).send('Nieprawidłowe żądanie czatu.'); }
});
app.listen(3000, '127.0.0.1', () => console.log('Chat API: http://127.0.0.1:3000'));
