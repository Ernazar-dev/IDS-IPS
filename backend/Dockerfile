# Base image as Node.js (slim version to keep it lightweight)
FROM node:18-slim

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Create virtual environment for Python to avoid PEP 668 restrictions on Debian
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages required for the ML model
RUN pip install --no-cache-dir joblib numpy xgboost scikit-learn

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_PATH=/opt/venv/bin/python
ENV USE_SQLITE=false

# Start command
CMD ["npm", "start"]
