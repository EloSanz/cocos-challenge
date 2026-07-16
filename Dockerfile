# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci --loglevel=error

# Copy source and config files
COPY . .

# Build NestJS application
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --loglevel=error --omit=dev

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Set user to node for security
USER node

# Expose port
EXPOSE 3000

# Start NestJS application
CMD ["node", "dist/main"]
