package com.h5packnative.location

import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationSettingsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocationSettings"

  /**
   * 检测系统定位服务是否开启（GPS + 网络定位任一开启即返回 true）
   */
  @ReactMethod
  fun isLocationEnabled(promise: Promise) {
    try {
      val locationManager =
        reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
      val networkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
      promise.resolve(gpsEnabled || networkEnabled)
    } catch (e: Exception) {
      promise.reject("E_LOCATION_CHECK_FAILED", e)
    }
  }

  /**
   * 跳转系统定位服务设置页
   */
  @ReactMethod
  fun openLocationSettings() {
    try {
      val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
    } catch (_: Exception) {
      // 部分设备可能不支持该 Intent，静默处理
    }
  }

  /**
   * 跳转应用详情设置页（用于"不再询问"后引导用户手动开启权限）
   */
  @ReactMethod
  fun openAppSettings() {
    try {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = android.net.Uri.fromParts("package", reactContext.packageName, null)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
    } catch (_: Exception) {
      // 静默处理
    }
  }
}
