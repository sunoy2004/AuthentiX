#!/bin/bash

echo "========================================"
echo "  AuthentiX Backend Server"
echo "  Starting FastAPI on port 8000"
echo "========================================"
echo ""

# Activate virtual environment if it exists
if [ -f venv/bin/activate ]; then
    source venv/bin/activate
    echo "Virtual environment activated"
else
    echo "WARNING: Virtual environment not found"
    echo "Please run: python -m venv venv"
    echo "Then install requirements: pip install -r requirements.txt"
    exit 1
fi

# Check if dependencies are installed
python -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Dependencies not installed"
    echo "Please run: pip install -r requirements.txt"
    exit 1
fi

echo ""
echo "Starting server..."
echo "API Documentation: http://localhost:8000/docs"
echo "Health Check: http://localhost:8000/"
echo ""

python main.py
