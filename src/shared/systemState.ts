/**
 * Shared system state for inter-process communication
 */

import { join } from 'path';
import { getRootDir } from '../shared/config.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const STATE_FILE = 'data/system-state.json';

export interface SystemState {
  paused: boolean;
  pausedAt?: string;
  activeScan: boolean;
  lastScanAt?: string;
  scanCycleId?: string;
}

const defaultState: SystemState = {
  paused: false,
  activeScan: false,
};

export function getState(): SystemState {
  const rootDir = getRootDir();
  const stateFile = join(rootDir, STATE_FILE);

  if (!existsSync(stateFile)) {
    return { ...defaultState };
  }

  try {
    return JSON.parse(readFileSync(stateFile, 'utf-8'));
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: SystemState): void {
  const rootDir = getRootDir();
  const stateFile = join(rootDir, STATE_FILE);

  const dataDir = join(rootDir, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

export function pauseSystem(): SystemState {
  const state = getState();
  state.paused = true;
  state.pausedAt = new Date().toISOString();
  saveState(state);
  return state;
}

export function resumeSystem(): SystemState {
  const state = getState();
  state.paused = false;
  state.pausedAt = undefined;
  saveState(state);
  return state;
}

export function setActiveScan(active: boolean, scanCycleId?: string): void {
  const state = getState();
  state.activeScan = active;
  state.scanCycleId = scanCycleId;
  if (active) state.lastScanAt = new Date().toISOString();
  saveState(state);
}
