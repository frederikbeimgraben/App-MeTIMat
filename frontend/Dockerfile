# Use Node.js for building the Angular application
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
# Context is the project root, so we copy from the frontend directory
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY . ./

# Build the Angular application
# The output path is configured in angular.json to be relative to the project root (../public/app)
# Since we are in /app, the build output will be placed in /public/app
RUN npm run build -- --configuration production

# Second stage: Serve with Nginx
FROM nginx:alpine

# Clear the default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from the build stage
# The path /public/app matches the output directory from the build step
# We place it in /usr/share/nginx/html/app as defined in nginx.conf
COPY --from=build /public/app /usr/share/nginx/html/app

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
