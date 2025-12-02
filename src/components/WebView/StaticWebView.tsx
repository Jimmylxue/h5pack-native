import React, {useEffect, useRef} from 'react';
import {WebView as SnowWebView} from 'react-native-webview';
import {H5PackNativeBridge} from '../../core/H5PackBridge';
import {BackHandler} from 'react-native';

export function StaticWebView(props: {
  url: string;
  refresh?: boolean;
  onMessage?(data: string): void;
  ignore?: boolean;
  injectedJavaScript?: string;
}) {
  const {url} = props;

  const canBackRef = useRef(false);

  const webViewRef = useRef<SnowWebView | null>(null);

  const nativeBridge = useRef<H5PackNativeBridge | null>(null);

  useEffect(() => {
    const handleBackButtonPress = () => {
      try {
        if (canBackRef.current) {
          webViewRef.current?.goBack();
        }
        return canBackRef.current;
      } catch (err) {
        console.log('[handleBackButtonPress] Error : ', err);
      }
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackButtonPress);

    return () => {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        handleBackButtonPress,
      );
    };
  }, []);

  return (
    <SnowWebView
      ref={webViewRef}
      originWhitelist={['*']}
      scalesPageToFit={false}
      useWebKit={true}
      javaScriptEnabled
      source={{uri: `file:///android_asset/webview/${url}`}}
      /** 这个属性让 webview 尽量与浏览器的标准相近 */
      mixedContentMode={'compatibility'}
      /** 引用本地的地址的webview 这个一定要加上 不然只能读到js 不能读到其他的资源 */
      allowUniversalAccessFromFileURLs={true}
      /** Ios 默认需要用户操作才可以播放音乐和视频 加上这个属性可以忽略掉这个 */
      mediaPlaybackRequiresUserAction={false}
      onLoadEnd={() => {
        nativeBridge.current = new H5PackNativeBridge(webViewRef.current!);
      }}
      onMessage={event => {
        nativeBridge.current?.handleMessage(event);
      }}
      onNavigationStateChange={event => {
        canBackRef.current = event.canGoBack;
      }}
    />
  );
}
