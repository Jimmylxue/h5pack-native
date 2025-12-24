import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {H5PackNativeBridge} from '..';
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
      // iOS 处理 - 需要额外的权限检查逻辑
      return true;
    } catch (error) {
      console.log('error');
      throw this.wrapError(error, 'PERMISSION_CHECK_ERROR');
    }
  }

  /**
   * 申请录音权限
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '麦克风权限申请',
            message: '应用需要访问您的麦克风以录音',
            buttonPositive: '同意',
            buttonNegative: '拒绝',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      // iOS 处理
      return true;
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_REQUEST_ERROR');
    }
  }

  // 确保有麦克风权限
  async ensureRecordAudioPermission() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('Record audio permission denied');
      }
    }
    return true;
  }

  wrapError(error: any, code: any) {
    return {
      message: error.message,
      code: code,
      originalError: error,
    };
  }
}
