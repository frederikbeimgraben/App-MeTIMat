#!/bin/bash

# Wait for database to be ready (invokes wait_for_db logic in initial_data.py)
python app/initial_data.py wait

# Run migrations to ensure the schema is up to date
alembic upgrade head

# Run the seeding script to ensure initial data (admin user, master data) exists
python app/initial_data.py
