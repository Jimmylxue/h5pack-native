import {NativeModules, Platform} from 'react-native';

const {LocationSettings} = NativeModules;

/**
 * 检测系统定位服务是否开启
 */
export async function isLocationEnabled(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return LocationSettings.isLocationEnabled();
  }
  // iOS 暂不支持，返回 true 避免阻断流程
  return true;
}

/**
 * 跳转系统定位服务设置页
 */
export function openLocationSettings(): void {
  if (Platform.OS === 'android') {
    LocationSettings.openLocationSettings();
  }
}

/**
 * 跳转应用详情设置页（用于"不再询问"后引导用户手动开启权限）
 */
export function openAppSettings(): void {
  if (Platform.OS === 'android') {
    LocationSettings.openAppSettings();
  }
}
