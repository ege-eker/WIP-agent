import { Router, Request, Response } from 'express';
import { AgentService } from '../../agent/agent.service';
import { SessionService } from '../../session/session.service';
import { ILogger } from '../../core/interfaces/logger.interface';
import { validate } from '../middleware/validate.middleware';
import { chatRequestSchema, createSessionSchema } from '../validators/chat.validators';
import { chatRateLimiter } from '../middleware/rate-limiter.middleware';
import { inputSanitizer } from '../middleware/input-sanitizer.middleware';

export function chatRoutes(
  agentService: AgentService,
  sessionService: SessionService,
  logger: ILogger
): Router {
  const router = Router();

  // Create a new session
  router.post('/sessions', inputSanitizer, validate(createSessionSchema), (req: Request, res: Response) => {
    const session = sessionService.create(req.body.title);
    res.status(201).json(session);
  });

  // List sessions
  router.get('/sessions', (_req: Request, res: Response) => {
    const sessions = sessionService.list();
    res.json(sessions);
  });

  // Get session
  router.get('/sessions/:id', (req: Request, res: Response) => {
    const session = sessionService.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  // Chat via SSE
  router.post('/', chatRateLimiter, inputSanitizer, validate(chatRequestSchema), async (req: Request, res: Response) => {
    const { sessionId, message } = req.body;

    const session = sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add user message to session
    sessionService.addMessage(sessionId, { role: 'user', content: message });

    try {
      const history = sessionService.getHistory(sessionId).slice(0, -1); // exclude the just-added user message
      let assistantContent = '';

      for await (const event of agentService.run(sessionId, message, history)) {
        const data = JSON.stringify({ type: event.type, data: event.data });
        res.write(`data: ${data}\n\n`);

        if (event.type === 'text_delta' && typeof event.data === 'string') {
          assistantContent += event.data;
        }
      }

      // Save assistant response to session
      if (assistantContent) {
        sessionService.addMessage(sessionId, { role: 'assistant', content: assistantContent });
      }

      res.write(`data: ${JSON.stringify({ type: 'done', data: null })}\n\n`);
      res.end();
    } catch (err) {
      logger.error('Chat error', { error: err instanceof Error ? err.message : String(err), sessionId });
      const errorData = JSON.stringify({ type: 'error', data: { message: 'An error occurred processing your request.' } });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  });

  return router;
}
