# ---------- Etapa 1: compilar la app ----------
FROM node:22-alpine AS build
WORKDIR /app

# pnpm (el proyecto usa pnpm-lock.yaml)
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Dependencias primero, para aprovechar la caché de Docker
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Código del proyecto
COPY . .

# Vite genera la versión de producción en /app/dist
RUN pnpm build

# ---------- Etapa 2: servir los archivos estáticos ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]