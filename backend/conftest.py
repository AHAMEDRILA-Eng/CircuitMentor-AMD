"""
conftest.py — pytest root configuration for the CircuitMentor backend.

Adds the backend/ directory to sys.path so that all test files can import
top-level modules (main, local_circuit_engine, eil_validator, groq_llm, etc.)
without needing manual sys.path.insert() in each test file.

This file is auto-loaded by pytest before any tests run.
"""
import sys
import os

# backend/ is this file's parent directory
BACKEND_DIR = os.path.dirname(__file__)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
