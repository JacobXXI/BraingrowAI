from app import app, db, ensure_reaction_columns

with app.app_context():
    db.create_all()
    ensure_reaction_columns()

