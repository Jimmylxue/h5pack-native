/**
 * 本地运行android时，指定appId
 */

try {
  require('dotenv').config();
} catch (_) {}
const {execSync} = require('child_process');

const appId = process.env.APP_PACKAGE_NAME || 'com.h5pack.native';

execSync(`npx react-native run-android --appId ${appId}`, {stdio: 'inherit'});
