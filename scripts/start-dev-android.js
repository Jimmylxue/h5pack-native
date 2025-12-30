/**
 * 启动 http 服务器
 */

try {
  require('dotenv').config();
} catch (_) {}
const {execSync} = require('child_process');

const port =
  Number(process.env.APP_WEBVIEW_DEV_PORT) || Number(process.env.PORT) || 9999;

try {
  execSync(`adb reverse tcp:${port} tcp:${port}`, {stdio: 'inherit'});
} catch (e) {
  console.error(
    `Failed to setup adb reverse on port ${port}. Is a device connected?`,
  );
}

process.env.PORT = String(port);
require('./webview-dev-server');
