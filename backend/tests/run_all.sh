#!/bin/bash
echo "Running API Tests..."
PYTHONPATH=. pytest tests/
