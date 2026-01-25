#!/bin/bash

# Wait for database to be ready (invokes wait_for_db logic in initial_data.py)
python app/initial_data.py wait

# Check if the database already has tables (e.g. 'users') but no alembic history.
# If it's an existing DB from before the Alembic refactor, we stamp it to
# the initial migration ID so Alembic knows it's already "up to date".
# We use a python one-liner to check for the 'users' table.
TABLE_EXISTS=$(python -c "from app.db.session import SessionLocal; from sqlalchemy import inspect; db=SessionLocal(); print(inspect(db.get_bind()).has_table('users')); db.close()")

if [ "$TABLE_EXISTS" = "True" ]; then
    echo "Existing database detected. Checking for migration history..."
    # Attempt to stamp the initial migration.
    # If alembic_version table exists and has a record, this does nothing.
    # If it doesn't exist, it creates it and sets version to 9002221650b6.
    alembic stamp 9002221650b6
fi

# Run migrations to ensure the schema is up to date
alembic upgrade head

# Run the seeding script to ensure initial data (admin user, master data) exists
python app/initial_data.py
