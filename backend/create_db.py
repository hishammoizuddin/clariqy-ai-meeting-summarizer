import psycopg2
from psycopg2 import sql
import os

def create_db():
    password = os.getenv("AIVEN_PASSWORD", "your_password_here")
    conn = psycopg2.connect(
        dbname="defaultdb",
        user="avnadmin",
        password=password,
        host="aisynch-labs-db-aisynchlabs-service.f.aivencloud.com",
        port="20299",
        sslmode="require"
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check if database exists
    cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'clariqy-db'")
    exists = cur.fetchone()
    
    if not exists:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier("clariqy-db")))
        print("Database clariqy-db created successfully.")
    else:
        print("Database clariqy-db already exists.")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    create_db()
