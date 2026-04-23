import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    {
      provide: 'NG_ALLOWED_HOSTNAMES',
      useValue: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        'host.docker.internal',
        '192.168.1.170',
        'angular-app.local',
      ],
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);