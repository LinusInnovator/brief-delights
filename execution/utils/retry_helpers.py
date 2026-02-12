#!/usr/bin/env python3
"""
Retry Decorator for Newsletter Pipeline
Adds exponential backoff retry logic to critical functions.
"""

import time
import functools
from typing import Callable, Any


def retry_with_backoff(
    max_attempts: int = 3,
    initial_delay: float = 5.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Retry decorator with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        backoff_factor: Multiplier for delay after each attempt
        exceptions: Tuple of exceptions to catch and retry
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            delay = initial_delay
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts:
                        # Final attempt failed
                        print(f"❌ {func.__name__} failed after {max_attempts} attempts")
                        raise
                    
                    print(f"⚠️ {func.__name__} attempt {attempt} failed: {str(e)}")
                    print(f"   Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    delay *= backoff_factor
            
            # Should never reach here, but just in case
            raise last_exception
        
        return wrapper
    return decorator


def validate_json_file(filepath: str, min_size: int = 100) -> bool:
    """
    Validate that a JSON file exists and is properly formatted.
    
    Args:
        filepath: Path to JSON file
        min_size: Minimum file size in bytes
    
    Returns:
        True if valid, False otherwise
    """
    import json
    from pathlib import Path
    
    path = Path(filepath)
    
    # Check exists
    if not path.exists():
        print(f"❌ File not found: {filepath}")
        return False
    
    # Check size
    size = path.stat().st_size
    if size < min_size:
        print(f"❌ File too small: {size} bytes (expected >={min_size})")
        return False
    
    # Check JSON structure
    try:
        with open(path, 'r') as f:
            data = json.load(f)
        
        # Basic validation
        if not isinstance(data, dict):
            print(f"❌ Invalid JSON structure: not a dict")
            return False
        
        print(f"✅ File validated: {filepath} ({size:,} bytes)")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Validation error: {str(e)}")
        return False
