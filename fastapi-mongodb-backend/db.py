# Database Connections and Collection Definitions

# Configuring the MongoDB Database Connection Import Module
from pymongo import MongoClient

# Connecting to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["my_project_database"]

# Defining Collections
roles_collection = db["roles"]
resources_collection = db["resources"]
change_patterns_collection = db["change_patterns"]

# Unique index: guarantees that field values are unique and is used to prevent duplicate data.
roles_collection.create_index("name", unique=True)
resources_collection.create_index("name", unique=True)
change_patterns_collection.create_index("name", unique=True)

try:
    # Test connection
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
except Exception as e:
    print(f"Could not connect to MongoDB: {e}")

