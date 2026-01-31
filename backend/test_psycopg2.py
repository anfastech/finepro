# Quick test - check if psycopg2-binary is available

try:
    import psycopg2
    print("✅ psycopg2 imported successfully")
    import psycopg2.extras
    print("✅ psycopg2.extras imported successfully")
    import psycopg2_binary
    print("✅ psycopg2-binary imported successfully")
except ImportError as e:
    print(f"❌ Error importing psycopg2: {e}")