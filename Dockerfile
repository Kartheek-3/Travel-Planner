# ==========================================
# MULTI-STAGE DOCKERFILE: PYTHON FLASK + VITE REACT
# ==========================================

# --- Stage 1: Build the Vite React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Runtime ---
FROM python:3.11-slim
WORKDIR /app

# Install gunicorn for high-concurrency production serving
RUN pip install --no-cache-dir gunicorn

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application files
COPY backend/ ./backend/

# Copy the compiled static frontend files so Flask can serve them
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the standard Cloud Run port
EXPOSE 8080

# Set environment to production
ENV PYTHONUNBUFFERED=1

# Start the Flask application using Gunicorn for production scalability
WORKDIR /app/backend
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 8 --timeout 0 app:app"]
