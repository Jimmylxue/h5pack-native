import {Alert, BackHandler, DeviceEventEmitter} from 'react-native';
import {resetNavigate} from '../../../navigation/navigate';

export type TBaseParams = {
  confirm?: boolean;
  title?: string;
  message?: string;
  okText?: string;
  cancelText?: string;
};

export class AppModule {
  constructor() {}
  async handle(action: any, params: any) {
    switch (action) {
      case 'exit':
        return await this.exit(params);
      case 'relaunch':
        return await this.relaunch(params);
      case 'refresh':
        return await this.refresh(params);
      default:
        throw new Error(`Unknown app action: ${action}`);
    }
  }

  /**
   * 退出APP
   */
  async exit(params?: TBaseParams) {
    const ok = await this.confirmIfNeeded({
      action: 'exit',
      ...(params || {}),
      defaultMessage: '确定退出应用吗？',
    });
    if (!ok) return;
    BackHandler.exitApp();
  }

  /**
   * 重新打开APP
   */
  async relaunch(params?: TBaseParams) {
    const ok = await this.confirmIfNeeded({
      action: 'relaunch',
      ...(params || {}),
      defaultMessage: '确定重启应用吗？',
    });
    if (!ok) return;
    resetNavigate({index: 0, routes: [{name: 'Main'}]});
    DeviceEventEmitter.emit('APP_RELAUNCH');
  }

  /**
   * 刷新APP
   */
  async refresh(params?: TBaseParams) {
    const ok = await this.confirmIfNeeded({
      action: 'refresh',
      ...(params || {}),
      defaultMessage: '确定刷新应用吗？',
    });
    if (!ok) return;
    DeviceEventEmitter.emit('APP_REFRESH');
  }

  private confirmIfNeeded({
    confirm = false,
    title,
    message,
    okText,
    cancelText,
    defaultMessage,
  }: {
    action: 'exit' | 'relaunch' | 'refresh';
    confirm?: boolean;
    title?: string;
    message?: string;
    okText?: string;
    cancelText?: string;
    defaultMessage?: string;
  }): Promise<boolean> {
    if (!confirm) return Promise.resolve(true);
    return new Promise(resolve => {
      Alert.alert(
        title || '提示',
        message || defaultMessage || '确定执行操作吗？',
        [
          {
            text: cancelText || '取消',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: okText || '确定',
            style: 'default',
            onPress: () => resolve(true),
          },
        ],
        {cancelable: true},
      );
    });
  }
}
