import sys
from sqlmodel import Session, select
from utils.db import engine, Meeting, init_db

def test_db():
    print("Testing database connection and initialization...")
    try:
        # This will trigger table creation if not exists
        init_db()
        print("init_db completed.")
        
        with Session(engine) as session:
            # Try to query the table
            stmt = select(Meeting).limit(1)
            result = session.exec(stmt).all()
            print(f"Query successful. Found {len(result)} meetings.")
            
    except Exception as e:
        print(f"Error testing DB: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_db()
