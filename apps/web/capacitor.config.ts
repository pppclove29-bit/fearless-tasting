import type { CapacitorConfig } from '@capacitor/cli';

const SERVER_URL = process.env.CAP_SERVER_URL || 'https://fearless-tasting.pages.dev';

const config: CapacitorConfig = {
  appId: 'kr.fearlesstasting.app',
  appName: '무모한 시식가',
  webDir: 'dist',
  server: {
    url: SERVER_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
