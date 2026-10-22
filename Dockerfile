# =============================================================================
# CH-Inventur – Build der PWA und Auslieferung als statische Seite via nginx.
# Zweistufig: Node baut das Vite-Bundle, nginx liefert das fertige dist/ aus.
# =============================================================================

# --- Build-Stufe -------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Abhängigkeiten zuerst (bessere Layer-Caches)
COPY package*.json ./
RUN npm ci

COPY . .

# Vite backt VITE_*-Variablen zur Build-Zeit ins Bundle. Der anon-Key ist
# öffentlich (läuft ohnehin im Browser), daher als Build-Arg unbedenklich.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# --- Serve-Stufe -------------------------------------------------------------
FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
