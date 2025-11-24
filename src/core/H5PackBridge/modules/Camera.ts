import {PermissionsAndroid, Platform} from 'react-native';
import {H5PackNativeBridge} from '..';

export class CameraModule {
  constructor(private bridge: H5PackNativeBridge) {}

  async handle(action: any, params: any) {
    switch (action) {
      case 'open':
        return await this.open(params);
      case 'checkPermission':
        return await this.checkPermission();
      case 'requestPermission':
        return await this.requestPermission();
      default:
        throw new Error(`Unknown camera action: ${action}`);
    }
  }

  // 打开相机
  async open(options = {}) {
    // try {
    //   // // 检查权限
    //   await this.ensureCameraPermission();
    //   return new Promise((resolve, reject) => {
    //     launchCamera(
    //       {
    //         mediaType: options.mediaType || 'photo',
    //         maxWidth: options.maxWidth || 1920,
    //         maxHeight: options.maxHeight || 1080,
    //         quality: options.quality === 'high' ? 1 : 0.7,
    //         includeBase64: options.includeBase64 !== false,
    //         saveToPhotos: options.saveToPhotos || false,
    //         cameraType: options.cameraType || 'back',
    //         durationLimit: options.durationLimit, // 视频时长限制
    //       },
    //       response => {
    //         this.handleCameraResponse(response, resolve, reject);
    //       },
    //     );
    //   });
    // } catch (error) {
    //   throw this.wrapError(error, 'CAMERA_ERROR');
    // }
  }

  async checkPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
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

  // 申请相机权限
  async requestPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '相机权限申请',
            message: '应用需要访问您的相机以拍照或录像',
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

  // 确保有相机权限
  async ensureCameraPermission() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('Camera permission denied');
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
