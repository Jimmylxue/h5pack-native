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
          error => {
            console.log('权限请求失败');
            reject(
              this.wrapError(
                new Error('Location permission denied'),
                'LOCATION_ERROR',
              ),
            );
          },
        );
      } catch (error) {
        throw this.wrapError(error, 'LOCATION_ERROR');
      }
    });
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
