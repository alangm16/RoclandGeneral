# Usamos la versión de Node recomendada para Angular 21
FROM node:22-alpine

WORKDIR /app

# Instalamos Angular CLI de forma global (opcional, pero ayuda a ejecutar comandos)
RUN npm install -g @angular/cli

# Copiamos solo archivos de dependencias para aprovechar el caché de capas
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto por defecto de Angular
EXPOSE 4200

# Comando para desarrollo con SSR activo
# El flag --host 0.0.0.0 es obligatorio para que el tráfico salga del contenedor
CMD ["ng", "serve", "--host", "0.0.0.0"]