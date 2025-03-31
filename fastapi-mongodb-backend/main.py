# The main entry file, which defines the API routing for processing requests.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db import roles_collection, resources_collection, change_patterns_collection
from typing import Dict, List, Optional
from pydantic import BaseModel
from enum import Enum
from fastapi.responses import JSONResponse
import pymongo


# Creating a FastAPI Instance
app = FastAPI()

# Adding a CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

# Role Management
class Permission(BaseModel):
    resource: str
    actions: List[str]

class Role(BaseModel):
    name: str 
    parent_role: Optional[str] = None 
    permissions: List[Permission]  
    mutually_exclusive_roles: List[str] = []  
    max_members: Optional[int] = None  
    inherit_child_permissions: bool = True 

# Resource Management
class ResourceStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"

class Resource(BaseModel):
    name: str
    status: ResourceStatus = ResourceStatus.AVAILABLE
    description: Optional[str] = None

# ====================== CRUD for dynamic data insertion ======================
# Dynamic Data Insertion Interface
@app.post("/add-data/{collection_name}")
async def add_data(collection_name: str, data: Dict):
    if collection_name not in ["roles", "resources", "change_patterns"]:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    try:
        collection = globals()[f"{collection_name}_collection"]
        result = collection.insert_one(data)
        return {
            "message": "Data added successfully",
            "data": {k: v for k, v in data.items() if k != '_id'}
        }
    except pymongo.errors.DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail=f"Item with name '{data.get('name')}' already exists in {collection_name}"
        )

# Dedicated interfaces: Insertion logic for roles and resources requires additional checks 
# (e.g., existence of parent roles, mutually exclusive role checks, complex resource constraints, etc.)
@app.post("/add-data/roles")
async def add_role(role: Role):
    if roles_collection.find_one({"name": role.name}):
        raise HTTPException(status_code=400, detail="Role already exists")

    roles_collection.insert_one(role.dict())
    return {"message": "Role added successfully", "data": role.dict()}

# Dedicated interfaces: Insert resource with name duplicate check
@app.post("/add-data/resources")
async def add_resource(resource: Resource):
    if resources_collection.find_one({"name": resource.name}):
        raise HTTPException(status_code=400, detail="Resource already exists")

    resources_collection.insert_one(resource.dict())
    return {"message": "Resource added successfully", "data": resource.dict()}

# Dedicated interfaces: Insert role with parent role and mutually exclusive role check
@app.post("/roles")
async def create_role(role: Role):
    if role.parent_role:
        parent = roles_collection.find_one({"name": role.parent_role})
        if not parent:
            raise HTTPException(status_code=400, detail="Parent role does not exist")
    
    for exclusive_role in role.mutually_exclusive_roles:
        if not roles_collection.find_one({"name": exclusive_role}):
            raise HTTPException(status_code=400, detail=f"Mutually exclusive role {exclusive_role} does not exist")
    
    try:
        roles_collection.insert_one(role.dict())
        return {"message": "Role created successfully", "data": role.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Dedicated interfaces: Insert resource with name duplicate check
@app.post("/resources")
async def create_resource(resource: Resource):
    try:
        existing_resource = resources_collection.find_one({"name": resource.name})
        if existing_resource:
            raise HTTPException(status_code=400, detail="Resource already exists")
            
        resource_dict = resource.dict()
        resources_collection.insert_one(resource_dict)

        return {
            "message": "Resource created successfully",
            "data": {
                "name": resource.name,
                "status": resource.status,
                "description": resource.description
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Dynamic Data Query Interface
@app.get("/get-data/{collection_name}")
async def get_data(collection_name: str, name: Optional[str] = None):
   
    if collection_name not in ["roles", "resources", "change_patterns"]:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    collection = globals()[f"{collection_name}_collection"]
    query = {"name": name} if name else {}
    
    data = list(collection.find(query, {"_id": 0}))
    
    return {"data": data}

# Dedicated interfaces: Query logic for roles requires additional checks
@app.get("/roles")
async def get_roles():
    roles = list(roles_collection.find({}, {"_id": 0}))
    return {"data": roles}

@app.get("/roles/hierarchy")
async def get_role_hierarchy():
    roles = list(roles_collection.find({}, {"_id": 0}))
    hierarchy = {}
    
    for role in roles:
        if not role["parent_role"]:
            hierarchy[role["name"]] = _build_hierarchy(role["name"], roles)
            
    return {"data": hierarchy}

def _build_hierarchy(parent_name: str, roles: List[dict]) -> dict:
    children = {}
    for role in roles:
        if role["parent_role"] == parent_name:
            children[role["name"]] = _build_hierarchy(role["name"], roles)
    return children

@app.get("/roles/{role_name}/permissions")
async def get_role_permissions(role_name: str):
    role = roles_collection.find_one({"name": role_name}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    permissions = set(
        f"{perm['resource']}:{action}" 
        for perm in role.get("permissions", [])
        for action in perm.get("actions", [])
    )
    
    if role.get("inherit_child_permissions", True):
        child_permissions = _get_child_permissions(role_name)
        permissions.update(child_permissions)  
    
    permissions_list = sorted(list(permissions))
    
    return {
        "role_name": role_name,
        "permissions": permissions_list,
        "total_count": len(permissions_list)
    }

def _get_child_permissions(parent_role_name: str) -> set:
    child_roles = roles_collection.find({"parent_role": parent_role_name}, {"_id": 0})
    child_permissions = set()
    
    for child in child_roles:
        child_permissions.update(
            f"{perm['resource']}:{action}" 
            for perm in child.get("permissions", [])
            for action in perm.get("actions", [])
        )
        
        if child.get("inherit_child_permissions", True):
            child_permissions.update(_get_child_permissions(child["name"]))
    
    return child_permissions

# Dedicated interfaces: Query logic for resources requires additional checks
@app.get("/resources")
async def get_resources():
    resources = list(resources_collection.find({}, {"_id": 0}))
    return {"data": resources}


# Dynamic Update Interface
@app.put("/update-data/{collection_name}/{identifier}")
async def update_data(collection_name: str, identifier: str, updated_data: Dict):
    collection = globals()[f"{collection_name}_collection"]
    result = collection.update_one({"name": identifier}, {"$set": updated_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    return {"message": "Data updated successfully"}

# Dedicated interfaces: Update resource status
@app.put("/resources/{resource_name}/toggle-status")
async def toggle_resource_status(resource_name: str):
    resource = resources_collection.find_one({"name": resource_name})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    new_status = ResourceStatus.UNAVAILABLE if resource["status"] == ResourceStatus.AVAILABLE else ResourceStatus.AVAILABLE
    
    resources_collection.update_one(
        {"name": resource_name},
        {"$set": {"status": new_status}}
    )
    return {"message": "Resource status updated successfully"}


# Dynamic Deletion Interface
@app.delete("/delete-data/{collection_name}/{identifier}")
async def delete_data(collection_name: str, identifier: str):
    collection = globals()[f"{collection_name}_collection"]
    result = collection.delete_one({"name": identifier})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    return {"message": "Data deleted successfully"}

# Dedicated interfaces: delete resource
@app.delete("/resources/{resource_name}")
async def delete_resource(resource_name: str):
    result = resources_collection.delete_one({"name": resource_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource deleted successfully"}


# Dedicated interfaces: delete role with child role check
@app.delete("/roles/{role_name}")
async def delete_role(role_name: str):
    if roles_collection.find_one({"parent_role": role_name}):
        raise HTTPException(status_code=400, detail="Cannot delete role with child roles")
    
    result = roles_collection.delete_one({"name": role_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted successfully"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": f"An error occurred: {str(exc)}"}
    )

