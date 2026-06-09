import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {H5PackNativeBridge} from '..';
import {openAppSettings} from '../../../native/LocationSettings';
const {Recording} = NativeModules;

type PermissionStatus = 'granted' | 'denied' | 'never_ask_again';

export type StartOptions = {
  fileName?: string;
  sampleRate?: number;
  bitRate?: number;
};

export type StopResult = {
  path: string;
  durationMs: number;
};

export class RecordAudioModule {
  constructor(private bridge: H5PackNativeBridge) {}

  async handle(action: any, params: any) {
    switch (action) {
      case 'start':
        return await this.start(params);
      case 'stop':
        return await this.stop();
      case 'cancel':
        return await this.cancel();
      case 'restart':
        return await this.restart(params);
      case 'checkPermission':
        return await this.checkPermission();
      case 'requestPermission':
        return await this.requestPermission();
      case 'openAppSettings':
        return this.openAppSettingsAction();
      default:
        throw new Error(`Unknown record audio action: ${action}`);
    }
  }

  /**
   * 开始录音
   */
  async start(options: StartOptions) {
    try {
      await this.ensureRecordAudioPermission();
      return await Recording.start(options);
    } catch (error) {
      throw this.wrapError(error, 'RECORD_AUDIO_ERROR');
    }
  }

  /**
   * 停止录音
   */
  async stop() {
    try {
      return await Recording.stop();
    } catch (error) {
      throw this.wrapError(error, 'RECORD_AUDIO_ERROR');
    }
  }

  /**
   * 取消录音
   */
  async cancel() {
    try {
      return await Recording.cancel();
    } catch (error) {
      throw this.wrapError(error, 'RECORD_AUDIO_ERROR');
    }
  }

  /**
   * 重新录音
   */
  async restart(options: StartOptions) {
    try {
      return await Recording.restart(options);
    } catch (error) {
      throw this.wrapError(error, 'RECORD_AUDIO_ERROR');
    }
  }

  /**
   * 检查是否有录音权限
   */
  async checkPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        return granted;
      }
      throw new Error('Record audio permission check is not supported on iOS yet');
    } catch (error) {
      console.log('error');
      throw this.wrapError(error, 'PERMISSION_CHECK_ERROR');
    }
  }

  /**
   * 申请录音权限
   * 返回 { granted, status } 以区分三种状态
   */
  async requestPermission(): Promise<{granted: boolean; status: PermissionStatus}> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '麦克风权限申请',
            message: '应用需要访问您的麦克风以录音',
            buttonPositive: '同意',
            buttonNegative: '拒绝',
          },
        );

        switch (result) {
          case PermissionsAndroid.RESULTS.GRANTED:
            return {granted: true, status: 'granted'};
          case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
            return {granted: false, status: 'never_ask_again'};
          default:
            return {granted: false, status: 'denied'};
        }
      }
      throw new Error('Record audio permission request is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_REQUEST_ERROR');
    }
  }

  // 确保有麦克风权限
  async ensureRecordAudioPermission() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const {granted, status} = await this.requestPermission();
      if (!granted) {
        if (status === 'never_ask_again') {
          throw this.wrapError(
            new Error('麦克风权限被永久拒绝，请前往设置页手动开启'),
            'RECORD_AUDIO_PERMISSION_NEVER_ASK_AGAIN',
          );
        }
        throw this.wrapError(
          new Error('麦克风权限被拒绝'),
          'RECORD_AUDIO_PERMISSION_DENIED',
        );
      }
    }
    return true;
  }

  /**
   * 跳转应用详情设置页（用于"不再询问"后引导用户手动开启权限）
   */
  openAppSettingsAction(): void {
    openAppSettings();
  }

  wrapError(error: any, code: string, details?: Record<string, any>) {
    let message: string;
    if (error?.message) {
      message = error.message;
    } else if (typeof error === 'object') {
      message = JSON.stringify(error);
    } else {
      message = String(error);
    }
    return {
      message,
      code,
      ...(details ? {details} : {}),
    };
  }
}
