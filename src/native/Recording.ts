import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
} from 'react-native';

const {Recording} = NativeModules;

export type StartOptions = {
  fileName?: string;
  sampleRate?: number;
  bitRate?: number;
};

export type StopResult = {
  path: string;
  durationMs: number;
};

const emitter = new NativeEventEmitter(Recording);

export const onRecordingStart = (listener: (e: {path: string}) => void) =>
  emitter.addListener('recordingStart', listener);

export const onRecordingStop = (
  listener: (e: {path: string; durationMs: number}) => void,
) => emitter.addListener('recordingStop', listener);

export const onRecordingCancel = (listener: (e: {path?: string}) => void) =>
  emitter.addListener('recordingCancel', listener);

export const onRecordingRestart = (listener: () => void) =>
  emitter.addListener('recordingRestart', listener);

export async function start(options?: StartOptions): Promise<string> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('RECORD_AUDIO permission denied');
    }
    return Recording.start(options ?? {});
  }
  throw new Error('Recording.start not implemented on this platform');
}

export async function stop(): Promise<StopResult> {
  if (Platform.OS === 'android') {
    return Recording.stop();
  }
  throw new Error('Recording.stop not implemented on this platform');
}

export async function cancel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Recording.cancel();
    return;
  }
  throw new Error('Recording.cancel not implemented on this platform');
}

export async function restart(options?: StartOptions): Promise<string> {
  if (Platform.OS === 'android') {
    return Recording.restart(options ?? {});
  }
  throw new Error('Recording.restart not implemented on this platform');
}
