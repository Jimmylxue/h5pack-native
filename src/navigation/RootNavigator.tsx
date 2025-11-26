import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Main} from './Main';
import {CameraScreen} from './Camera';

type TRootStackParams = {
  Auth: undefined;
  Main: undefined;
  Camera: undefined;
};

export const RootStack = createNativeStackNavigator<TRootStackParams>();

export const RootNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{
        gestureEnabled: false,
        headerTitleAlign: 'center',
        animation: 'slide_from_right',
        headerShadowVisible: false,
        headerBackButtonMenuEnabled: false,
        headerTintColor: 'rgba(0, 0, 0, 0.85)',
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}>
      <RootStack.Screen
        name="Main"
        component={Main}
        options={{headerShown: false}}
      />
      <RootStack.Screen
        name="Camera"
        component={CameraScreen}
        options={{headerShown: false}}
      />
    </RootStack.Navigator>
  );
};
