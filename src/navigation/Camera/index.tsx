import React from 'react';
import {Text, View} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

export function CameraScreen() {
  const device = useCameraDevice('back');

  if (!device) {
    return (
      <View>
        <Text>没有相机</Text>
      </View>
    );
  }

  return <Camera device={device} isActive={true} />;
}
