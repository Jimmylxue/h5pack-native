import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useRef} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {goBack, TRootStackParams} from '../navigate';
import RNFS from 'react-native-fs';

type RouterParams = RouteProp<TRootStackParams, 'Camera'>;

export function CameraScreen() {
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const route = useRoute<RouterParams>();

  if (!device) {
    return (
      <View>
        <Text>没有相机</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton]}
          onPress={async () => {
            const photo = await cameraRef.current?.takePhoto({
              flash: 'off',
              enableShutterSound: true,
            });
            // 转换为 base64
            const base64String = await RNFS.readFile(photo!.path, 'base64');
            const base64Url = `data:image/jpeg;base64,${base64String}`;
            route.params.onSuccess(base64Url);
            goBack();
          }}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewButtons: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: '#fff',
    minWidth: 120,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#ff3b30',
  },
  useButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
