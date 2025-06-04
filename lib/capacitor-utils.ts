import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

// Camera utilities
export const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error taking picture:', error);
    throw error;
  }
};

export const pickImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Geolocation utilities
export const getCurrentPosition = async () => {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });
    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

// Share utilities
export const shareContent = async (title: string, text: string, url?: string) => {
  try {
    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share with friends'
    });
  } catch (error) {
    console.error('Error sharing:', error);
    throw error;
  }
};

// Toast utilities
export const showToast = async (message: string) => {
  try {
    await Toast.show({
      text: message,
      duration: 'short',
      position: 'bottom'
    });
  } catch (error) {
    console.error('Error showing toast:', error);
  }
};

// Haptics utilities
export const vibrate = async (style: ImpactStyle = ImpactStyle.Medium) => {
  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.error('Error with haptics:', error);
  }
};

// Browser utilities
export const openUrl = async (url: string) => {
  try {
    await Browser.open({ url });
  } catch (error) {
    console.error('Error opening URL:', error);
  }
};

// Check if app can use native features
export const canUseCamera = () => {
  return isNative() && Capacitor.isPluginAvailable('Camera');
};

export const canUseGeolocation = () => {
  return isNative() && Capacitor.isPluginAvailable('Geolocation');
};

export const canUseHaptics = () => {
  return isNative() && Capacitor.isPluginAvailable('Haptics');
}; 