FROM python:3.11-slim

WORKDIR /app

ARG COMMIT_SHA=dev
ENV COMMIT_SHA=${COMMIT_SHA}

# Install system dependencies for psycopg2 and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONPATH=/app

# Expose the port the app runs on
EXPOSE 8000

# Start script to initialize DB and run the server
CMD ["sh", "-c", "./prestart.sh && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
