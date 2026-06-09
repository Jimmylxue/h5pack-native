import {PermissionsAndroid, Platform} from 'react-native';
import Config from 'react-native-config';
import {H5PackNativeBridge} from '..';
import {
  CameraOptions,
  launchCamera,
  launchImageLibrary,
  OptionsCommon,
} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import {navigates} from '../../../navigation/navigate';
import {openAppSettings} from '../../../native/LocationSettings';

type PermissionStatus = 'granted' | 'denied' | 'never_ask_again';

export class CameraModule {
  constructor(private bridge: H5PackNativeBridge) {}

  async handle(action: any, params: any) {
    switch (action) {
      case 'open':
        return await this.open(params);
      case 'chooseImage':
        return await this.chooseImage(params);
      case 'checkPermission':
        return await this.checkPermission();
      case 'requestPermission':
        return await this.requestPermission();
      case 'checkPhotoLibraryPermission':
        return await this.checkPhotoLibraryPermission();
      case 'requestPhotoLibraryPermission':
        return await this.requestPhotoLibraryPermission();
      case 'scan':
        return await this.scan();
      case 'openAppSettings':
        return this.openAppSettingsAction();
      default:
        throw new Error(`Unknown camera action: ${action}`);
    }
  }

  /**
   * 打开相机
   */
  async open(options: CameraOptions) {
    try {
      await this.ensureCameraPermission();
      const result = await launchCamera(options);
      const asset = result?.assets?.[0];
      if (!asset?.uri) {
        throw new Error('拍照失败：未获取到图片');
      }
      const base64 = await this.filePathToBase64(asset.uri);
      return {...asset, base64};
    } catch (error) {
      throw this.wrapError(error, 'CAMERA_ERROR');
    }
  }

  /**
   * 检查是否有相册权限
   */
  async checkPhotoLibraryPermission() {
    try {
      if (Platform.OS === 'android') {
        const permission =
          Platform.Version >= 33
            ? 'android.permission.READ_MEDIA_IMAGES'
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const granted = await PermissionsAndroid.check(permission);
        return granted;
      }
      throw new Error('Photo library permission is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_CHECK_ERROR');
    }
  }

  /**
   * 申请相册权限
   * 返回 { granted, status } 以区分三种状态
   */
  async requestPhotoLibraryPermission(): Promise<{granted: boolean; status: PermissionStatus}> {
    try {
      if (Platform.OS === 'android') {
        const permission =
          Platform.Version >= 33
            ? 'android.permission.READ_MEDIA_IMAGES'
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const result = await PermissionsAndroid.request(permission, {
          title: '相册权限申请',
          message: '应用需要访问您的相册以选择图片',
          buttonPositive: '同意',
          buttonNegative: '拒绝',
        });

        switch (result) {
          case PermissionsAndroid.RESULTS.GRANTED:
            return {granted: true, status: 'granted'};
          case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
            return {granted: false, status: 'never_ask_again'};
          default:
            return {granted: false, status: 'denied'};
        }
      }
      throw new Error('Photo library permission is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_REQUEST_ERROR');
    }
  }

  /**
   * 确保有相册权限
   */
  async ensurePhotoLibraryPermission() {
    const hasPermission = await this.checkPhotoLibraryPermission();
    if (!hasPermission) {
      const {granted, status} = await this.requestPhotoLibraryPermission();
      if (!granted) {
        if (status === 'never_ask_again') {
          throw this.wrapError(
            new Error('相册权限被永久拒绝，请前往设置页手动开启'),
            'PHOTO_LIBRARY_PERMISSION_NEVER_ASK_AGAIN',
          );
        }
        throw this.wrapError(
          new Error('相册权限被拒绝'),
          'PHOTO_LIBRARY_PERMISSION_DENIED',
        );
      }
    }
    return true;
  }

  /**
   * 打开相册选择图片
   */
  async chooseImage(params: OptionsCommon) {
    try {
      await this.ensurePhotoLibraryPermission();
    } catch (error) {
      // 如果已经是结构化错误（含 code），直接抛出
      if (error?.code) {
        throw error;
      }
      throw this.wrapError(error, 'CAMERA_ERROR');
    }
    return new Promise((resolve, reject) => {
      launchImageLibrary(params, async response => {
        if (response.didCancel) {
          reject(new Error('用户取消了选择'));
        } else if (response.errorCode) {
          reject(new Error(`选择失败: ${response.errorMessage}`));
        } else if (response.assets && response.assets.length > 0) {
          try {
            const processedImages = [];
            for (const image of response.assets) {
              const result = await this.processImage(image, params);
              processedImages.push(result);
            }
            console.log('processedImages', processedImages);
            resolve(processedImages);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('没有选择图片'));
        }
      });
    });
  }

  /**
   * 检查是否有相机权限
   */
  async checkPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        return granted;
      }
      throw new Error('Camera permission check is not supported on iOS yet');
    } catch (error) {
      console.log('error');
      throw this.wrapError(error, 'PERMISSION_CHECK_ERROR');
    }
  }

  /**
   * 申请相机权限
   * 返回 { granted, status } 以区分三种状态
   */
  async requestPermission(): Promise<{granted: boolean; status: PermissionStatus}> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '相机权限申请',
            message: '应用需要访问您的相机以拍照或录像',
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
      throw new Error('Camera permission request is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_REQUEST_ERROR');
    }
  }

  /**
   * 扫码
   */
  async scan() {
    try {
      const scanEnabled =
        String(Config.APP_SCAN_ENABLED || '').toLowerCase() === 'true';
      if (!scanEnabled) {
        throw this.wrapError(
          new Error('扫码功能未启用，请在 h5pack.json 中设置 scanEnabled: true'),
          'SCAN_NOT_ENABLED',
        );
      }
      await this.ensureCameraPermission();
      return new Promise(async resolve => {
        navigates('Scan', {
          onSuccess(res) {
            resolve(res);
          },
        });
      });
    } catch (error) {
      throw this.wrapError(error, 'CAMERA_ERROR');
    }
  }

  // 确保有相机权限
  async ensureCameraPermission() {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const {granted, status} = await this.requestPermission();
      if (!granted) {
        if (status === 'never_ask_again') {
          throw this.wrapError(
            new Error('相机权限被永久拒绝，请前往设置页手动开启'),
            'CAMERA_PERMISSION_NEVER_ASK_AGAIN',
          );
        }
        throw this.wrapError(
          new Error('相机权限被拒绝'),
          'CAMERA_PERMISSION_DENIED',
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

  // 处理图片数据
  private async processImage(image: any, params: any) {
    const {uri, fileName, fileSize, width, height, base64} = image;

    const result: any = {
      uri,
      width,
      height,
      fileSize,
      fileName: fileName || 'image.jpg',
      base64: await this.filePathToBase64(uri),
    };

    // 如果 picker 已返回 base64，直接使用（避免重复读取文件）
    if (params?.includeBase64 && base64) {
      result.base64 = `data:image/jpeg;base64,${base64}`;
    }

    return result;
  }

  /**
   * 将文件路径或 content URI 读取为 base64 data URL。
   * RNFS.readFile 原生端通过 ContentResolver 支持 content:// URI，
   * 因此无需额外转换。
   */
  private async filePathToBase64(filePath: string) {
    try {
      const base64String = await RNFS.readFile(filePath, 'base64');
      return `data:image/jpeg;base64,${base64String}`;
    } catch (error: any) {
      throw new Error(
        `读取图片失败 (uri: ${filePath}): ${error?.message || error}`,
      );
    }
  }
}
