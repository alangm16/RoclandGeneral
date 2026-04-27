# Etapa 1: Compilación de Angular
FROM node:22-alpine AS build
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y compilar
COPY . .
RUN npm run build --configuration=production

# Etapa 2: Servidor Web Ligero (Nginx)
FROM nginx:alpine

# Copiamos los archivos estáticos al servidor
# NOTA: Verifica que "rocland-general" sea el nombre correcto de tu proyecto 
# en la propiedad "outputPath" de tu angular.json. Si no tiene "/browser", quítalo.
COPY --from=build /app/dist/rocland-general/browser /usr/share/nginx/html

# Exponer el puerto de Nginx
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]