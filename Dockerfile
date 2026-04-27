# Etapa 1: Compilación usando Server Core de Windows
FROM node:20-windowsservercore-ltsc2022 AS build
WORKDIR /app

# Copiamos e instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el código y compilamos
COPY . .
RUN npm run build --configuration=production

# Etapa 2: Servidor Web en Windows Container
FROM node:20-windowsservercore-ltsc2022
WORKDIR /app

# Instalamos el servidor estático
RUN npm install -g serve

# Copiamos el build
COPY --from=build /app/dist/rocland-general/browser ./

EXPOSE 80

# serve -s redirige el tráfico a index.html (vital para Angular)
CMD ["serve", "-s", ".", "-l", "80"]