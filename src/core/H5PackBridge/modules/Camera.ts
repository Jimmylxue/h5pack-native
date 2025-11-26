import {PermissionsAndroid, Platform} from 'react-native';
import {H5PackNativeBridge} from '..';
import {
  CameraOptions,
  launchCamera,
  launchImageLibrary,
  OptionsCommon,
} from 'react-native-image-picker';
import RNFS from 'react-native-fs';

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
      default:
        throw new Error(`Unknown camera action: ${action}`);
    }
  }

  // 打开相机
  async open(options: CameraOptions) {
    try {
      // // 检查权限
      await this.ensureCameraPermission();
      return new Promise(async resolve => {
        const result = await launchCamera(options);
        const filePath = result?.assets?.[0]?.uri!;
        const base64 = await this.filePathToBase64(filePath);
        resolve({...result?.assets?.[0], base64});
      });
    } catch (error) {
      throw this.wrapError(error, 'CAMERA_ERROR');
    }
  }

  async chooseImage(params: OptionsCommon) {
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

  // 处理图片数据
  private async processImage(image: any, params: any) {
    const {uri, fileName, fileSize, width, height, base64} = image;

    let accessibleUri = uri;

    // 构建返回结果
    const result: any = {
      uri: accessibleUri,
      width,
      height,
      fileSize,
      fileName: fileName || 'image.jpg',
      base64: await this.filePathToBase64(accessibleUri),
    };

    // 如果需要 base64
    if (params?.includeBase64 && base64) {
      result.base64 = `data:image/jpeg;base64,${base64}`;
    }

    return result;
  }

  private async filePathToBase64(filePath: string) {
    const base64String = await RNFS.readFile(filePath, 'base64');
    const base64Url = `data:image/jpeg;base64,${base64String}`;
    return base64Url;
  }
}
