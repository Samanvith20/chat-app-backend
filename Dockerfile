# Use Node.js with a specific version
FROM node:latest

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on (adjust as needed)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]