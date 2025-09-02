#!/bin/bash

echo "🛑 Stopping WhatsApp MCP SSE Server..."

# Stop and remove containers
docker-compose down

echo "✅ Services stopped successfully!"
