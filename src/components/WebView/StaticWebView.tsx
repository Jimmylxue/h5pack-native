import React, {useEffect, useRef, useState} from 'react';
import {WebView as SnowWebView} from 'react-native-webview';
import {H5PackNativeBridge} from '../../core/H5PackBridge';
import {BackHandler, DeviceEventEmitter} from 'react-native';
import RNFS from 'react-native-fs';
import Config from 'react-native-config';
// 使用 react-native-config 来获取环境变量

export function StaticWebView({
  url,
  baseUrl = '/',
}: {
  url?: string;
  baseUrl?: string;
  refresh?: boolean;
  onMessage?(data: string): void;
  ignore?: boolean;
  injectedJavaScript?: string;
}) {
  const canBackRef = useRef(false);

  const entry = url?.endsWith('/') ? url + 'index.html' : url + '/index.html';

  const normalizeBaseUrl = (val?: string) => {
    let p = (val || '').trim();
    if (p === '' || p === '.' || p === './')
      return (
        'file:///android_asset/webview/' +
        (url?.endsWith('/') ? url : url + '/')
      );
    while (p.startsWith('./')) p = p.slice(2);
    if (p.startsWith('/')) p = p.slice(1);
    return `file:///android_asset/webview/${url}${p}`;
  };
  const useBaseUrl = normalizeBaseUrl(baseUrl);
  // 从环境变量中获取是否需要重写 HTML 中的 URL 为相对路径

  const webViewRef = useRef<SnowWebView | null>(null);

  const nativeBridge = useRef<H5PackNativeBridge | null>(null);
  const [html, setHtml] = useState<string | null>(null);

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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('APP_REFRESH', () => {
      try {
        webViewRef.current?.reload();
      } catch (e) {
        console.log('[StaticWebView] reload error', e);
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const rewriteToRelative = (s: string) =>
      s
        .replace(/(src|href)=["']\/(assets\/[^"']+)["']/g, '$1="$2"')
        .replace(/url\(["']?\/(assets\/[^"')]+)["']?\)/g, 'url("$1")');
    const load = async () => {
      try {
        const devEnabled =
          String(Config.APP_WEBVIEW_DEV_ENABLED || '').toLowerCase() === 'true';
        if (devEnabled) {
          setHtml(null);
          return;
        }
        const content = await RNFS.readFileAssets(`webview/${entry}`, 'utf8');
        setHtml(rewriteToRelative(content));
      } catch (e) {
        console.log('[StaticWebView] load html error: ', e);
        setHtml(null);
      }
    };
    load();
    return;
  }, [entry]);

  const devEnabled =
    String(Config.APP_WEBVIEW_DEV_ENABLED || '').toLowerCase() === 'true';
  const devPort = parseInt(String(Config.APP_WEBVIEW_DEV_PORT || '9999'), 10);
  const devHost = 'localhost';
  const devUrl = `http://${devHost}:${devPort}/`;

  return devEnabled ? (
    <SnowWebView
      ref={webViewRef}
      originWhitelist={['*']}
      scalesPageToFit={false}
      javaScriptEnabled
      source={{uri: devUrl}}
      mixedContentMode={'compatibility'}
      allowUniversalAccessFromFileURLs={true}
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
  ) : (
    html && (
      <SnowWebView
        ref={webViewRef}
        originWhitelist={['*']}
        scalesPageToFit={false}
        // useWebKit={true}
        javaScriptEnabled
        source={{
          html,
          baseUrl: useBaseUrl,
        }}
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
    )
  );
}
