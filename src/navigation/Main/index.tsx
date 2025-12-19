import React, {View} from 'react-native';
import {StaticWebView} from '../../components/WebView/StaticWebView';

export function Main() {
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
      }}>
      <StaticWebView url="dist/" />
    </View>
  );
}
