import string
import random
from typing import Optional

def generate_short_id(length: int = 12) -> str:
    """
    Generate a short alphanumeric ID without dashes
    
    Args:
        length: Length of the ID to generate (default 12)
    
    Returns:
        Alphanumeric string without special characters
    """
    characters = string.ascii_lowercase + string.digits
    return ''.join(random.choices(characters, k=length))

def generate_workspace_id() -> str:
    """Generate workspace ID"""
    return generate_short_id(12)

def generate_user_id() -> str:
    """Generate user ID"""
    return generate_short_id(12)

def generate_project_id() -> str:
    """Generate project ID"""
    return generate_short_id(12)

def generate_task_id() -> str:
    """Generate task ID"""
    return generate_short_id(10)

def generate_member_id() -> str:
    """Generate member ID"""
    return generate_short_id(10)

def generate_epic_id() -> str:
    """Generate epic ID"""
    return generate_short_id(10)

def generate_invite_code() -> str:
    """Generate workspace invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=8))

def is_valid_short_id(id_str: str, min_length: int = 8, max_length: int = 12) -> bool:
    """
    Validate if a string is a valid short alphanumeric ID
    
    Args:
        id_str: String to validate
        min_length: Minimum allowed length
        max_length: Maximum allowed length
    
    Returns:
        True if valid, False otherwise
    """
    if not id_str:
        return False
    
    # Check length
    if len(id_str) < min_length or len(id_str) > max_length:
        return False
    
    # Check if contains only alphanumeric characters and no dashes
    allowed_chars = string.ascii_letters + string.digits
    return all(c in allowed_chars for c in id_str)