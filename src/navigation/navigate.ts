import {NavigationContainerRef} from '@react-navigation/native';
import * as React from 'react';

export type TRootStackParams = {
  Main: undefined;
  Camera: {
    onSuccess: (res: string) => void;
  };
  Scan: {
    onSuccess: (res: string) => void;
  };
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
