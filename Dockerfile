FROM python:3.11-slim

# Create a working directory
WORKDIR /app

# Install system dependencies needed for compiling sqlite, chromadb, etc.
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]