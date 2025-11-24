import WebView, {WebViewMessageEvent} from 'react-native-webview';
import {CameraModule} from './modules/Camera';

export class H5PackNativeBridge {
  handlers: Record<string, any> = {};
  modules: Record<string, any> = {};

  constructor(private webViewRef: WebView) {
    this.setupModules();
  }

  // 设置模块
  setupModules() {
    // 注册模块
    this.modules.camera = new CameraModule(this);

    // 设置处理器
    this.handlers = {
      camera: (action: string, params: any) =>
        this.modules.camera.handle(action, params),
      location: (action: string, params: any) =>
        this.modules.location.handle(action, params),
      file: (action: string, params: any) =>
        this.modules.file.handle(action, params),
    };
  }

  handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('ddd', data);
      if (data?.type === 'bridge_call') {
        const {module, action, params, callId} = data;

        if (!this.handlers[module]) {
          throw new Error(`Module not found: ${module}`);
        }

        try {
          const result = await this.handlers[module]?.(action, params);
          this.sendSuccess(callId, result);
        } catch (error) {
          this.sendError(callId, error);
        }
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
      // 发送解析错误响应
      this.sendError('parse_error', 'Failed to parse message', 'PARSE_ERROR');
    }
  };

  // 发送成功响应
  sendSuccess(callId: string, data: any) {
    const message = {
      type: 'bridge_response',
      callId,
      success: true,
      data,
    };
    this.webViewRef.postMessage(JSON.stringify(message));
  }

  // 发送错误响应
  sendError(callId: string, error: any, code = 'UNKNOWN_ERROR') {
    const message = {
      type: 'bridge_response',
      callId,
      success: false,
      error: {
        message: error,
        code: code,
        timestamp: Date.now(),
      },
    };
    this.sendToWebView(message);
  }

  // 发送消息到 WebView
  sendToWebView(message: any) {
    if (this.webViewRef) {
      const script = `
        if (window.__H5PACK_BRIDGE__ && window.__H5PACK_BRIDGE__.receiveResponse) {
          window.__H5PACK_BRIDGE__.receiveResponse(${JSON.stringify(message)});
        }
      `;
      this.webViewRef.injectJavaScript(script);
    }
  }
}
