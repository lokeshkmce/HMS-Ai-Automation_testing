import { logger } from '../utils/logger';

async function globalTeardown(): Promise<void> {
  logger.info('Global teardown completed — cleaning up resources');
  // Add any global cleanup here: close DB connections, remove temp files, etc.
}

export default globalTeardown;
