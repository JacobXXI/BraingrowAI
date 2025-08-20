import argparse
from app import app, db, User

def create_user_from_data(username, password, email=None, tendency=None, photoUrl=None):
    # Check if user already exists
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return False, "Username already exists"

    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        return False, "Email already registered"
    
    new_user = User(
        username=username,
        password=password,
        email=email,
        tendency=tendency,
        photoUrl=photoUrl
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        return True, "User created successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Database error: {str(e)}"

def import_users_from_file(filename):
    success_count = 0
    error_count = 0
    errors = []

    with open(filename, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue

            # Split line into fields (format: username,email,password)
            fields = line.split(',')
            if len(fields) != 3:
                error_count += 1
                errors.append(f"Line {line_num}: Invalid format - expected 'username,email,password'")
                continue

            username, email, password = [field.strip() for field in fields]

            # Validate required fields
            if not all([username, email, password]):
                error_count += 1
                errors.append(f"Line {line_num}: Missing required fields")
                continue

            # Create the user
            success, message = create_user_from_data(username=username, email=email, password=password)
            if success:
                success_count += 1
                print(f"Line {line_num}: {message}")
            else:
                error_count += 1
                errors.append(f"Line {line_num}: {message}")

    return success_count, error_count, errors

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Import users from a text file')
    parser.add_argument('filename', help='Path to text file containing user data (format: username,email,password)')
    args = parser.parse_args()

    with app.app_context():
        print(f"Importing users from {args.filename}...")
        success, errors, error_details = import_users_from_file(args.filename)

        print("\nImport Summary:")
        print(f"Successfully created: {success}")
        print(f"Failed: {errors}")

        if error_details:
            print("\nError details:")
            for error in error_details:
                print(f"- {error}")

        exit(0 if errors == 0 else 1)