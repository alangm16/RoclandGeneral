// signalr.service.ts (fragmento relevante)
import { Injectable, inject, effect } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/Environment';
import { AuthService } from '../../../core/auth/auth.service';

export type SignalRStatus = 'connected' | 'reconnecting' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection: HubConnection | undefined;
  private readonly authService = inject(AuthService);

  private statusSubject = new BehaviorSubject<SignalRStatus>('disconnected');
  public status$ = this.statusSubject.asObservable();

  private nuevaSolicitudSource = new Subject<void>();
  public nuevaSolicitud$ = this.nuevaSolicitudSource.asObservable();

  private solicitudResueltaSource = new Subject<void>();
  public solicitudResuelta$ = this.solicitudResueltaSource.asObservable();

  private salidaRegistradaSource = new Subject<void>();
  public salidaRegistrada$ = this.salidaRegistradaSource.asObservable();

  private apagadoIntencional = false;

  constructor() {
    effect(() => {
      const logueado = this.authService.estaLogueado();
      const proyecto = this.authService.proyectoActivo();
      if (!logueado || proyecto?.codigo !== 'acceso-control') {
        this.detenerConexion();
      }
    });
  }

  public iniciarConexion(): void {
    const proyecto = this.authService.proyectoActivo();
    if (!proyecto || proyecto.codigo !== 'acceso-control') return;

    const token = this.authService.getToken();
    if (!token) return;

    if (!this.authService.estaLogueado() || this.authService.proyectoActivo()?.codigo !== 'acceso-control') {
      return;
    }
    if (this.hubConnection?.state === HubConnectionState.Connected || this.hubConnection?.state === HubConnectionState.Connecting) {
      return;
    }
    this.apagadoIntencional = false;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/accesohub`, {
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect([2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.hubConnection.on('NuevaSolicitud', () => this.nuevaSolicitudSource.next());
    this.hubConnection.on('SolicitudResuelta', () => this.solicitudResueltaSource.next());
    this.hubConnection.on('SalidaRegistrada', () => this.salidaRegistradaSource.next());

    this.hubConnection.onreconnecting(() => this.statusSubject.next('reconnecting'));
    this.hubConnection.onreconnected(() => this.statusSubject.next('connected'));
    this.hubConnection.onclose(() => {
      this.statusSubject.next('disconnected');
      if (!this.apagadoIntencional && this.debeEstarConectado()) {
        setTimeout(() => this.iniciarConexion(), 10000);
      }
    });

    this.hubConnection.start()
      .then(() => this.statusSubject.next('connected'))
      .catch(() => {
        this.statusSubject.next('disconnected');
        if (!this.apagadoIntencional && this.debeEstarConectado()) {
          setTimeout(() => this.iniciarConexion(), 8000);
        }
      });
  }

  public detenerConexion(): void {
    this.apagadoIntencional = true;
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Disconnected) {
      this.hubConnection.stop().then().catch();
      this.statusSubject.next('disconnected');
    }
  }

  public get isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  private debeEstarConectado(): boolean {
    return this.authService.estaLogueado() && this.authService.proyectoActivo()?.codigo === 'acceso-control';
  }
}