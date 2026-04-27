export const environment = {
  production: true,
  // Ruta relativa: Caddy interceptará esto y lo enviará al backend
  apiUrl: '/api/web/accesocontrol', 
  // Ruta relativa para WebSockets
  hubUrl: '/accesohub',
  nombreEmpresa: 'Rocland'
};