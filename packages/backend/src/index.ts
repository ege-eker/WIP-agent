import { env } from './env';
import { createContainer } from './container';
import { createApp } from './app';

async function main() {
  const container = await createContainer();
  const app = createApp(container);

  app.listen(env.port, () => {
    container.logger.info(`Server running on port ${env.port}`, {
      env: env.nodeEnv,
      documentsPath: env.documentsPath,
    });
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
