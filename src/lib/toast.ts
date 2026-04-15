import Toast from 'react-native-toast-message';

export function showToast(message: string, kind: 'success' | 'error' = 'success'): void {
  Toast.show({
    type: kind,
    text1: message,
    position: 'bottom',
  });
}
