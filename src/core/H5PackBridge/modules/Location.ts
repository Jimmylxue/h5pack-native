import {H5PackNativeBridge} from '..';
import Geolocation, {
  GeolocationOptions,
} from '@react-native-community/geolocation';

export class LocationModule {
  constructor(private bridge: H5PackNativeBridge) {}

  async handle(action: any, params: any) {
    switch (action) {
      case 'getCurrentPosition':
        return await this.getCurrentPosition(params);
      default:
        throw new Error(`Unknown camera action: ${action}`);
    }
  }

  // 获取当前位置
  async getCurrentPosition(options: GeolocationOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        Geolocation.requestAuthorization(
          () => {
            console.log('权限请求成功');
            Geolocation.getCurrentPosition(
              info => resolve(info),
              error => {
                reject(error);
              },
              options,
            );
          },
          () => {
            console.log('权限请求失败');
          },
        );
      } catch (error) {
        throw this.wrapError(error, 'LOCATION_ERROR');
      }
    });
  }

  wrapError(error: any, code: any) {
    return {
      message: error.message,
      code: code,
      originalError: error,
    };
  }
}
