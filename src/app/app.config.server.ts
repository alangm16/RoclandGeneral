import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Configuramos los hosts permitidos para evitar el error de SSRF
    {
      provide: 'NG_ALLOWED_HOSTNAMES',
      useValue: [
      'localhost', 
      '127.0.0.1', 
      '0.0.0.0', // <-- ¡Faltaba este!
      'host.docker.internal', // <-- Crucial para WSL2/Windows
      '192.168.1.170', 
      'angular-app.local' 
    ]
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);