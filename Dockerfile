# Etapa 1: Compilación usando Node nativo para Windows NanoServer
FROM node:20-nanoserver-ltsc2022 AS build
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código y compilamos para producción
COPY . .
RUN npm run build --configuration=production

# Etapa 2: Servidor Web Ligero en NanoServer
FROM node:20-nanoserver-ltsc2022
WORKDIR /app

# Instalamos 'serve', el servidor HTTP recomendado para SPAs en Node
RUN npm install -g serve

# Copiamos los archivos estáticos desde la etapa de compilación
# (Verifica que la carpeta coincida con tu angular.json)
COPY --from=build /app/dist/rocland-general/browser ./

# Exponemos el puerto 80 (interno del contenedor)
EXPOSE 80

# Ejecutamos el servidor. El flag "-s" asegura que el enrutamiento de Angular funcione 
# (redirige los 404 al index.html) y "-l 80" lo ata al puerto 80.
CMD ["serve", "-s", ".", "-l", "80"]