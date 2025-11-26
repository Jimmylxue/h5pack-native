import {NavigationContainerRef} from '@react-navigation/native';
import * as React from 'react';

export type TRootStackParams = {
  Auth: undefined;
  Main: undefined;
  Painting: undefined;
  Camera: {
    onSuccess: (res: string) => void;
  };
  Home: undefined;
  Message: undefined;
  Mine: undefined;
};

export const navigationRef =
  React.createRef<NavigationContainerRef<TRootStackParams>>();

export function navigates<T extends keyof TRootStackParams>(
  name: T,
  params?: TRootStackParams[T],
) {
  navigationRef.current?.navigate(name as any, params);
}

export function goBack() {
  navigationRef.current?.goBack();
}

export function resetNavigate({
  index,
  routes,
}: {
  index: number;
  routes: {name: keyof TRootStackParams}[];
}) {
  return navigationRef.current?.reset({
    index,
    routes,
  });
}
