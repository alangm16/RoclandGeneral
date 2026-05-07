// src/app/modules/acceso-control/services/signalr.service.ts

import { Injectable, inject, effect } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import { AuthService } from '../../../core/auth/auth.service';

export type SignalRStatus = 'connected' | 'reconnecting' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection: HubConnection | undefined;
  private readonly authService = inject(AuthService);
  
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

  // 🛑 Bandera para saber si nosotros lo apagamos intencionalmente
  private apagadoIntencional = false;

  constructor() {
    // 🧠 MAGIA REACTIVA: Vigilar la sesión en tiempo real
    effect(() => {
      const logueado = this.authService.estaLogueado();
      const proyectoActual = this.authService.proyectoActual();
      
      // Si cierra sesión o cambia a un proyecto distinto (Ej. Super Admin), APAGAMOS TODO
      if (!logueado || proyectoActual !== 'acceso-control-web') {
        this.detenerConexion();
      }
    });
  }

  public iniciarConexion(): void {
    // 1. Validación de seguridad y contexto
    if (!this.authService.estaLogueado() || this.authService.proyectoActual() !== 'acceso-control-web') {
      return; 
    }

    // 2. Evitar crear múltiples conexiones al mismo tiempo
    if (this.hubConnection?.state === HubConnectionState.Connected || this.hubConnection?.state === HubConnectionState.Connecting) {
      return;
    }

    this.apagadoIntencional = false;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/accesohub`, {
        // 💡 FIX CRÍTICO: El token debe leerse dinámicamente en CADA intento de reconexión
        accessTokenFactory: () => this.authService.getToken() ?? '' 
      })
      .withAutomaticReconnect([2000, 5000, 10000, 30000]) // Reconexión nativa de SignalR
      .configureLogging(LogLevel.Warning)
      .build();

    // 3. Escuchar eventos del backend
    this.hubConnection.on('NuevaSolicitud', () => this.nuevaSolicitudSource.next());
    this.hubConnection.on('SolicitudResuelta', () => this.solicitudResueltaSource.next());
    this.hubConnection.on('SalidaRegistrada', () => this.salidaRegistradaSource.next());

    // 4. Manejar estados de conexión
    this.hubConnection.onreconnecting(() => this.statusSubject.next('reconnecting'));
    this.hubConnection.onreconnected(() => this.statusSubject.next('connected'));
    this.hubConnection.onclose(() => {
      this.statusSubject.next('disconnected');
      
      // 💡 FIX: Solo forzar reconexión manual si fue un fallo de red y seguimos en el módulo correcto
      if (!this.apagadoIntencional && this.debeEstarConectado()) {
        setTimeout(() => this.iniciarConexion(), 10000);
      }
    });

    // 5. Iniciar
    this.hubConnection.start()
      .then(() => {
        
        this.statusSubject.next('connected');
      })
      .catch(err => {
        
        this.statusSubject.next('disconnected');
        
        // 💡 FIX: Mismo freno de emergencia aquí
        if (!this.apagadoIntencional && this.debeEstarConectado()) {
          setTimeout(() => this.iniciarConexion(), 8000);
        }
      });
  }

  public detenerConexion(): void {
    this.apagadoIntencional = true; // Frenamos los setTimeouts
    
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Disconnected) {
      this.hubConnection.stop()
        .then()
        .catch();
        
      this.statusSubject.next('disconnected');
    }
  }

  public get isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  // Helper interno
  private debeEstarConectado(): boolean {
    return this.authService.estaLogueado() && this.authService.proyectoActual() === 'acceso-control-web';
  }
}