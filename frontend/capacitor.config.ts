import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ttstore.app',
  appName: 'TT Store',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Para usar a URL do backend na rede local:
    // cleartext: true  ← habilita HTTP (não HTTPS) no Android
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1B2E5E',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1B2E5E',
    },
  },
};

export default config;
