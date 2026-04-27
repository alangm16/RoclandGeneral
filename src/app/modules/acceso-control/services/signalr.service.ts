// src/app/modules/acceso-control/services/signalr.service.ts

import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import { AuthService } from '../../../core/auth/auth.service'; // <-- 1. Importar el AuthService

export type SignalRStatus = 'connected' | 'reconnecting' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection: HubConnection | undefined;
  private readonly authService = inject(AuthService); // <-- 2. Inyectar el servicio
  
  // Estado de la conexión para la UI
  private statusSubject = new BehaviorSubject<SignalRStatus>('disconnected');
  public status$ = this.statusSubject.asObservable();

  // Eventos emitidos por el Hub
  private nuevaSolicitudSource = new Subject<void>();
  public nuevaSolicitud$ = this.nuevaSolicitudSource.asObservable();

  private solicitudResueltaSource = new Subject<void>();
  public solicitudResuelta$ = this.solicitudResueltaSource.asObservable();

  private salidaRegistradaSource = new Subject<void>();
  public salidaRegistrada$ = this.salidaRegistradaSource.asObservable();

  public iniciarConexion(): void {
    if (this.hubConnection?.state === HubConnectionState.Connected) return;

    // 3. Obtener el token actual
    const token = this.authService.getToken();

    this.hubConnection = new HubConnectionBuilder()
      // 4. Configurar el accessTokenFactory
      .withUrl(`${environment.apiUrl}/accesohub`, {
        accessTokenFactory: () => token ?? '' 
      })
      .withAutomaticReconnect([2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // 1. Escuchar eventos del backend
    this.hubConnection.on('NuevaSolicitud', () => this.nuevaSolicitudSource.next());
    this.hubConnection.on('SolicitudResuelta', () => this.solicitudResueltaSource.next());
    this.hubConnection.on('SalidaRegistrada', () => this.salidaRegistradaSource.next());

    // 2. Manejar estados de conexión
    this.hubConnection.onreconnecting(() => this.statusSubject.next('reconnecting'));
    this.hubConnection.onreconnected(() => this.statusSubject.next('connected'));
    this.hubConnection.onclose(() => {
      this.statusSubject.next('disconnected');
      setTimeout(() => this.iniciarConexion(), 10000);
    });

    // 3. Iniciar
    this.hubConnection.start()
      .then(() => this.statusSubject.next('connected'))
      .catch(err => {
        console.warn('SignalR: error al conectar, reintentando...', err);
        this.statusSubject.next('disconnected');
        setTimeout(() => this.iniciarConexion(), 8000);
      });
  }

  public detenerConexion(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.statusSubject.next('disconnected');
    }
  }

  public get isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }
}