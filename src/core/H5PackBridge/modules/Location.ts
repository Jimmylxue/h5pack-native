import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation, {GeolocationOptions} from '@react-native-community/geolocation';
import {H5PackNativeBridge} from '..';
import {
  isLocationEnabled,
  openLocationSettings,
  openAppSettings,
} from '../../../native/LocationSettings';

/**
 * 权限申请结果状态
 */
type PermissionStatus = 'granted' | 'denied' | 'never_ask_again';

export class LocationModule {
  constructor(private bridge: H5PackNativeBridge) {}

  async handle(action: any, params: any) {
    switch (action) {
      case 'getCurrentPosition':
        return await this.getCurrentPosition(params);
      case 'checkPermission':
        return await this.checkPermission();
      case 'requestPermission':
        return await this.requestPermission();
      case 'checkLocationEnabled':
        return await this.checkLocationEnabled();
      case 'openLocationSettings':
        return this.openLocationSettingsAction();
      case 'openAppSettings':
        return this.openAppSettingsAction();
      default:
        throw new Error(`Unknown location action: ${action}`);
    }
  }

  /**
   * 检查是否已授予定位权限
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }
      throw new Error('Location permission check is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_CHECK_ERROR');
    }
  }

  /**
   * 申请定位权限
   * 返回 { granted, status } 以区分三种状态
   */
  async requestPermission(): Promise<{granted: boolean; status: PermissionStatus}> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: '定位权限申请',
            message: '应用需要访问您的位置以提供定位服务',
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
      throw new Error('Location permission request is not supported on iOS yet');
    } catch (error) {
      throw this.wrapError(error, 'PERMISSION_REQUEST_ERROR');
    }
  }

  /**
   * 检查系统定位服务是否开启
   */
  async checkLocationEnabled(): Promise<boolean> {
    try {
      return await isLocationEnabled();
    } catch (error) {
      throw this.wrapError(error, 'LOCATION_ERROR');
    }
  }

  /**
   * 跳转系统定位服务设置页
   */
  openLocationSettingsAction(): void {
    openLocationSettings();
  }

  /**
   * 跳转应用详情设置页
   */
  openAppSettingsAction(): void {
    openAppSettings();
  }

  /**
   * 获取当前位置
   * 完整的权限检查 → 定位服务检查 → 获取定位流程
   */
  async getCurrentPosition(options: GeolocationOptions = {}) {
    try {
      // 1. 检查权限
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        // 2. 申请权限
        const {granted, status} = await this.requestPermission();
        if (!granted) {
          if (status === 'never_ask_again') {
            throw this.wrapError(
              new Error('定位权限被永久拒绝，请前往设置页手动开启'),
              'LOCATION_PERMISSION_NEVER_ASK_AGAIN',
            );
          }
          throw this.wrapError(
            new Error('定位权限被拒绝'),
            'LOCATION_PERMISSION_DENIED',
          );
        }
      }

      // 3. 检查定位服务是否开启
      const locationEnabled = await this.checkLocationEnabled();
      if (!locationEnabled) {
        throw this.wrapError(
          new Error('系统定位服务未开启，请前往设置页开启'),
          'LOCATION_SERVICES_DISABLED',
        );
      }

      // 4. 获取定位
      return await this.getPosition(options);
    } catch (error) {
      // 如果已经是结构化错误（含 code），直接抛出
      if (error?.code) {
        throw error;
      }
      throw this.wrapError(error, 'LOCATION_ERROR');
    }
  }

  /**
   * 调用 Geolocation.getCurrentPosition（内部方法）
   */
  private getPosition(options: GeolocationOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        info => resolve(info),
        error => reject(this.wrapError(error, 'LOCATION_ERROR')),
        options,
      );
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
