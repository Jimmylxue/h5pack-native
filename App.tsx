/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect} from 'react';
import {DeviceEventEmitter, SafeAreaView, StatusBar, useColorScheme} from 'react-native';
import Config from 'react-native-config';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import BootSplash from 'react-native-bootsplash';
import {RootNavigator} from './src/navigation/RootNavigator';
import {NavigationContainer as RNNavigationContainer} from '@react-navigation/native';
import {navigationRef} from './src/navigation/navigate';
import {BridgeDebugPanel} from './src/components/BridgeDebugPanel';
import {setBridgeLogEnabled} from './src/core/H5PackBridge/logger';

const devMode =
  String(Config.APP_WEBVIEW_DEV_ENABLED || '').toLowerCase() === 'true';

const debugPanelEnabled =
  String(Config.APP_BRIDGE_DEBUG_PANEL_ENABLED || '').toLowerCase() === 'true';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  useEffect(() => {
    // 调试面板开启时自动启用 Bridge 日志
    if (debugPanelEnabled) {
      setBridgeLogEnabled(true);
    }

    // 等 WebView 首屏加载完成后再隐藏 BootSplash
    const sub = DeviceEventEmitter.addListener('WEBVIEW_READY', () => {
      BootSplash.hide();
    });

    // 超时兜底：最多等 5 秒，防止 WebView 异常时 BootSplash 永远不消失
    const timer = setTimeout(() => {
      BootSplash.hide();
    }, 5000);

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <RNNavigationContainer ref={navigationRef}>
        <RootNavigator />
      </RNNavigationContainer>
      {debugPanelEnabled && <BridgeDebugPanel />}
    </SafeAreaView>
  );
}

export default App;
