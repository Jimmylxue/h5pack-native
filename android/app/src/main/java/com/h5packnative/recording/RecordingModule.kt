package com.h5packnative.recording

import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RecordingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  /** 录音器 */
  private var recorder: MediaRecorder? = null
  /** 输出文件 */
  private var outputFile: File? = null
  /** 开始时间 */
  private var startTimeMs: Long = 0L

  /** 模块名称 */
  override fun getName(): String = "Recording"
  
  /** 开始录音 */
  @ReactMethod
  fun start(options: com.facebook.react.bridge.ReadableMap?, promise: Promise) {
    try {
      if (recorder != null) {
        promise.reject("E_ALREADY_RECORDING", "Recording already in progress")
        return
      }

      /** 输出目录相关逻辑 */
      val baseDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
        ?: reactContext.getExternalFilesDir(null)
        ?: reactContext.filesDir
      val appName = try {
        reactContext.getString(com.h5packnative.R.string.app_name)
      } catch (_: Exception) {
        reactContext.applicationInfo.loadLabel(reactContext.packageManager).toString()
      }
      val dir = File(baseDir, "$appName/recordings")
      if (!dir.exists()) dir.mkdirs()
      val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
      val fileName = if (options != null && options.hasKey("fileName")) {
        options.getString("fileName")
      } else {
        "rec_$timestamp.m4a"
      }
      outputFile = File(dir, fileName)

      /** 创建录音器实例 */
      val r = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(reactContext) else MediaRecorder()
      recorder = r

      /** 设置录音参数 */
      r.setAudioSource(MediaRecorder.AudioSource.MIC)
      r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      r.setAudioChannels(1)
      val sampleRate = safeGetInt(options, "sampleRate", 44100)
      val bitRate = safeGetInt(options, "bitRate", 128000)
      r.setAudioSamplingRate(sampleRate)
      r.setAudioEncodingBitRate(bitRate)
      r.setOutputFile(outputFile!!.absolutePath)

      /** 准备录音并开始录音 */
      r.prepare()
      r.start()
      startTimeMs = System.currentTimeMillis()
      
      sendEvent("recordingStart", Arguments.createMap().apply {
        putString("path", outputFile!!.absolutePath)
      })
      promise.resolve(outputFile!!.absolutePath)
    } catch (e: Exception) {
      Log.e("RecordingModule", "start error", e)
      cleanupOnError()
      promise.reject("E_START_FAILED", e)
    }
  }

  /** 停止录音 */
  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val r = recorder
      if (r == null) {
        promise.reject("E_NOT_RECORDING", "No active recording")
        return
      }
      try {
        r.stop()
      } catch (e: Exception) {
        Log.e("RecordingModule", "stop error", e)
      } finally {
        r.reset()
        r.release()
      }
      recorder = null
      val duration = System.currentTimeMillis() - startTimeMs
      val path = outputFile?.absolutePath

      sendEvent("recordingStop", Arguments.createMap().apply {
        if (path != null) putString("path", path)
        putDouble("durationMs", duration.toDouble())
      })
      promise.resolve(Arguments.createMap().apply {
        if (path != null) putString("path", path)
        putDouble("durationMs", duration.toDouble())
      })
    } catch (e: Exception) {
      Log.e("RecordingModule", "stop error", e)
      cleanupOnError()
      promise.reject("E_STOP_FAILED", e)
    }
  }

  /** 取消录音 */
  @ReactMethod
  fun cancel(promise: Promise) {
    try {
      cancelInternal()
      promise.resolve(null)
    } catch (e: Exception) {
      Log.e("RecordingModule", "cancel error", e)
      cleanupOnError()
      promise.reject("E_CANCEL_FAILED", e)
    }
  }

  /** 重新开始录音 */
  @ReactMethod
  fun restart(options: com.facebook.react.bridge.ReadableMap?, promise: Promise) {
    try {
      val active = recorder != null
      if (active) {
        cancelInternal()
      }
      start(options, promise)
      sendEvent("recordingRestart", Arguments.createMap())
    } catch (e: Exception) {
      Log.e("RecordingModule", "restart error", e)
      promise.reject("E_RESTART_FAILED", e)
    }
  }

  private fun cleanupOnError() {
    try {
      recorder?.reset()
      recorder?.release()
    } catch (_: Exception) {
    }
    recorder = null
  }

  /** 取消录音 */
  private fun cancelInternal() {
    val r = recorder ?: return
    try {
      try {
        r.stop()
      } catch (e: Exception) {
        Log.e("RecordingModule", "cancel stop error", e)
      } finally {
        r.reset()
        r.release()
      }
      recorder = null
      val path = outputFile?.absolutePath
      if (path != null) {
        deleteOutputFileQuietly(path)
      }
      sendEvent("recordingCancel", Arguments.createMap().apply {
        if (path != null) putString("path", path)
      })
    } catch (e: Exception) {
      Log.e("RecordingModule", "cancelInternal error", e)
      cleanupOnError()
    }
  }

  /** 删除输出文件 */
  private fun deleteOutputFileQuietly(path: String) {
    try {
      val f = File(path)
      if (f.exists()) {
        f.delete()
      }
    } catch (_: Exception) {
    }
  }

  /** 安全获取 int 类型参数 */
  private fun safeGetInt(map: com.facebook.react.bridge.ReadableMap?, key: String, defaultValue: Int): Int {
    return try {
      if (map != null && map.hasKey(key) && !map.isNull(key)) {
        try {
          map.getInt(key)
        } catch (_: Exception) {
          map.getDouble(key).toInt()
        }
      } else {
        defaultValue
      }
    } catch (_: Exception) {
      defaultValue
    }
  }

  /** 发送事件 */
  private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }
}
