# MongoDB Schema: Parameter Mapping System

This document describes the collections and indexes created in the mapping_database container.

Collections
- vendors
  - Fields: name (unique), code (unique), is_active, contact { name, email, phone }, metadata, created_at, updated_at
  - Indexes:
    - { name: 1 } unique
    - { code: 1 } unique
    - { is_active: 1 }
    - { created_at: -1 }
- parameter_mappings
  - Fields: vendor_id (ObjectId), source_parameter, target_parameter, transform { type, config }, is_active, tags [string], created_at, updated_at
  - Indexes:
    - { vendor_id: 1, source_parameter: 1 } unique
    - { vendor_id: 1, target_parameter: 1 }
    - { is_active: 1 }
    - { tags: 1 }
    - { created_at: -1 }
- mapping_histories
  - Fields: mapping_id (ObjectId), vendor_id (ObjectId), change_type ("create"|"update"|"delete"), before, after, changed_by { user_id, name }, created_at
  - Indexes:
    - { mapping_id: 1, created_at: -1 }
    - { vendor_id: 1, created_at: -1 }
    - { change_type: 1 }

Validators
- JSON Schema validators are applied with validationLevel=moderate to allow iterative changes while enforcing core structure.

Initialization
- init_schema.js is executed by startup.sh after user setup, ensuring collections and indexes are available for CRUD from the Flask backend.

Connection
- Use MONGODB_URL / MONGODB_DB as provided in db_visualizer/mongodb.env and db_connection.txt for access.
