# Use Node.js LTS as the base image
FROM node:22-slim

# Set working directory
WORKDIR /workspace

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the application
RUN pnpm build

# Expose the port your app runs on
EXPOSE 8080

# Start the application
CMD ["pnpm", "start:prod"]
