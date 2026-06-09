# @h5pack/native

h5pack 打包原生 App 的资源。基于 React Native 构建，内置 WebView 加载 H5 页面，通过 Bridge 提供原生能力。

在线文档：[h5pack 文档](https://h5pack-docs.vercel.app/)

## 技术亮点

- **包体仅 18MB**：R8 代码混淆 + 资源收缩 + 仅保留 arm 架构
- **原生能力丰富**：相机、GPS、麦克风、相册、扫码等
- **Bridge 通信**：H5 与原生双向调用，像调函数一样简单
- **Dev 模式**：本地热更新，改完秒刷新

## 指令集合

### 生成启动页

```
yarn react-native generate-bootsplash ./public/splash/vite.svg  --platforms=android,ios
```

### 生成 app icon（android）

```
npx iconkits --input=./public/logo/logo.svg
```

### APK 体积分析

```
./scripts/analyze-apk.sh
```
