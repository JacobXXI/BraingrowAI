import argparse
from main import app
from models import db, User
from flask import Flask

def clear_users(username=None, email=None, delete_all=False):
    with app.app_context():
        # Safety check for bulk deletion
        if delete_all:
            confirm = input("WARNING: This will delete ALL users. Type 'CONFIRM' to proceed: ")
            if confirm != 'CONFIRM':
                print("Deletion cancelled.")
                return

        # Base query
        query = User.query

        # Apply filters if specified
        if username:
            query = query.filter_by(username=username)
        elif email:
            query = query.filter_by(email=email)
        elif not delete_all:
            print("Error: Must specify --username, --email, or --all")
            return

        # Execute deletion
        try:
            count = query.delete()
            db.session.commit()
            print(f"Successfully deleted {count} user(s)")
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting users: {str(e)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Clear users from the database')
    parser.add_argument('--username', help='Delete user with specific username')
    parser.add_argument('--email', help='Delete user with specific email')
    parser.add_argument('--all', action='store_true', help='Delete ALL users (requires confirmation)')
    args = parser.parse_args()

    clear_users(args.username, args.email, args.all)