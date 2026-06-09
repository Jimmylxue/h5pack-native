import {DeviceEventEmitter} from 'react-native';

export type BridgeLogEntry = {
  id: string;
  timestamp: number;
  direction: '→' | '←'; // → H5→Native, ← Native→H5
  module: string;
  action: string;
  params?: any;
  result?: any;
  error?: {message: string; code: string};
  duration?: number; // ms
};

const MAX_LOGS = 200;
const logs: BridgeLogEntry[] = [];
let pendingCalls: Record<string, {startTime: number; module: string; action: string; params: any}> = {};

let logEnabled = false;

export function setBridgeLogEnabled(enabled: boolean) {
  logEnabled = enabled;
}

export function isBridgeLogEnabled() {
  return logEnabled;
}

function emit() {
  DeviceEventEmitter.emit('BRIDGE_LOG_UPDATE');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 记录发起调用（H5 → Native） */
export function logRequest(module: string, action: string, params: any, callId: string) {
  if (!logEnabled) return;
  const id = generateId();
  const timestamp = Date.now();
  pendingCalls[callId] = {startTime: timestamp, module, action, params};
  const entry: BridgeLogEntry = {
    id,
    timestamp,
    direction: '→',
    module,
    action,
    params: params || undefined,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  emit();
}

/** 记录成功响应（Native → H5） */
export function logSuccess(callId: string, result: any) {
  if (!logEnabled) return;
  const pending = pendingCalls[callId];
  if (!pending) return;
  delete pendingCalls[callId];
  const id = generateId();
  const timestamp = Date.now();
  const entry: BridgeLogEntry = {
    id,
    timestamp,
    direction: '←',
    module: pending.module,
    action: pending.action,
    result: truncate(result),
    duration: timestamp - pending.startTime,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  emit();
}

/** 记录错误响应（Native → H5） */
export function logError(callId: string, error: any) {
  if (!logEnabled) return;
  const pending = pendingCalls[callId];
  if (!pending) return;
  delete pendingCalls[callId];
  const id = generateId();
  const timestamp = Date.now();
  const entry: BridgeLogEntry = {
    id,
    timestamp,
    direction: '←',
    module: pending.module,
    action: pending.action,
    error: {
      message: error?.message || String(error),
      code: error?.code || 'UNKNOWN_ERROR',
    },
    duration: timestamp - pending.startTime,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  emit();
}

export function getLogs(): BridgeLogEntry[] {
  return logs;
}

export function clearLogs() {
  logs.length = 0;
  pendingCalls = {};
  emit();
}

function truncate(value: any, maxLen = 200): any {
  if (value === undefined || value === null) return value;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (str.length <= maxLen) return value;
  return str.slice(0, maxLen) + '...';
}
