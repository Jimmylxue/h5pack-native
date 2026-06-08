package com.h5packnative.location

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LocationSettingsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> {
    return mutableListOf(LocationSettingsModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> {
    return mutableListOf()
  }
}
