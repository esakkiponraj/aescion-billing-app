import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobilePOSScreen } from './screens/MobilePOSScreen';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <MobilePOSScreen />
    </>
  );
}
