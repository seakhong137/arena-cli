import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { SessionStatus } from '../shared/types.js';

/**
 * Check if the current time falls within the NY session window
 */
export function checkSessionActive(): {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  nextOpen?: Date;
} {
  const config = loadConfig();
  const logger = getLogger();

  // Get current time in NY timezone
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: config.session.timezone });
  const nyNow = new Date(nyTimeStr);

  const [startHour, startMin] = config.session.start.split(':').map(Number);
  const [endHour, endMin] = config.session.end.split(':').map(Number);

  const sessionStart = new Date(nyNow);
  sessionStart.setHours(startHour, startMin, 0, 0);

  const sessionEnd = new Date(nyNow);
  sessionEnd.setHours(endHour, endMin, 0, 0);

  // Warm-up period
  const warmupStart = new Date(sessionStart);
  warmupStart.setMinutes(warmupStart.getMinutes() - config.session.warmupMinutes);

  const isActive = nyNow >= warmupStart && nyNow <= sessionEnd;

  logger.debug({
    msg: 'Session check',
    nyTime: nyNow.toISOString(),
    sessionStart: sessionStart.toISOString(),
    sessionEnd: sessionEnd.toISOString(),
    warmupStart: warmupStart.toISOString(),
    isActive,
  });

  return {
    isActive,
    startTime: sessionStart,
    endTime: sessionEnd,
    nextOpen: nyNow > sessionEnd ? getTomorrowSessionStart(config) : undefined,
  };
}

function getTomorrowSessionStart(config: ReturnType<typeof loadConfig>): Date {
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: config.session.timezone });
  const nyNow = new Date(nyTimeStr);

  const [startHour, startMin] = config.session.start.split(':').map(Number);
  const tomorrow = new Date(nyNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(startHour, startMin, 0, 0);

  return tomorrow;
}

/**
 * Get current session status
 */
export function getSessionStatus(): SessionStatus {
  const sessionCheck = checkSessionActive();

  return {
    isActive: sessionCheck.isActive,
    startTime: sessionCheck.startTime,
    endTime: sessionCheck.endTime,
    totalSignals: 0,
    totalApproved: 0,
    totalSuppressed: 0,
  };
}
