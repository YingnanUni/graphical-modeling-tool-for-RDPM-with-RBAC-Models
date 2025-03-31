import requests

BASE_URL = "http://127.0.0.1:8000"

# Test data for Roles and Resources
role_data = {
    "name": "Admin",
    "parent_role": None,
    "permissions": [
        {"resource": "File", "actions": ["read", "write"]},
        {"resource": "Database", "actions": ["read"]}
    ],
    "mutually_exclusive_roles": [],
    "max_members": 10,
    "inherit_child_permissions": True
}

resource_data = {
    "name": "Resource1",
    "status": "available",
    "description": "Main resource for testing"
}


# 1. Test POST: Add a Role
def test_add_role():
    response = requests.post(f"{BASE_URL}/roles", json=role_data)
    print("Add Role:", response.status_code, response.json())


# 2. Test POST: Add a Resource
def test_add_resource():
    response = requests.post(f"{BASE_URL}/resources", json=resource_data)
    print("Add Resource:", response.status_code, response.json())


# 3. Test GET: Get All Roles
def test_get_roles():
    response = requests.get(f"{BASE_URL}/roles")
    print("Get Roles:", response.status_code, response.json())


# 4. Test GET: Get All Resources
def test_get_resources():
    response = requests.get(f"{BASE_URL}/resources")
    print("Get Resources:", response.status_code, response.json())


# 5. Test GET: Get Role Hierarchy
def test_get_role_hierarchy():
    response = requests.get(f"{BASE_URL}/roles/hierarchy")
    print("Get Role Hierarchy:", response.status_code, response.json())


# 6. Test GET: Get Role Permissions
def test_get_role_permissions():
    response = requests.get(f"{BASE_URL}/roles/Admin/permissions")
    print("Get Role Permissions:", response.status_code, response.json())


# 7. Test PUT: Update Role
def test_update_role():
    updated_data = {"max_members": 15}
    response = requests.put(f"{BASE_URL}/update-data/roles/Admin", json=updated_data)
    print("Update Role:", response.status_code, response.json())


# 8. Test PUT: Toggle Resource Status
def test_toggle_resource_status():
    response = requests.put(f"{BASE_URL}/resources/Server1/toggle-status")
    print("Toggle Resource Status:", response.status_code, response.json())


# 9. Test DELETE: Delete a Role
def test_delete_role():
    response = requests.delete(f"{BASE_URL}/roles/Admin")
    print("Delete Role:", response.status_code, response.json())


# 10. Test DELETE: Delete a Resource
def test_delete_resource():
    response = requests.delete(f"{BASE_URL}/delete-data/resources/Server1")
    print("Delete Resource:", response.status_code, response.json())


# Run all tests
if __name__ == "__main__":
    print("Testing FastAPI Endpoints...\n")
    test_add_role()
    test_add_resource()
    test_get_roles()
    test_get_resources()
    test_get_role_hierarchy()
    test_get_role_permissions()
    test_update_role()
    test_toggle_resource_status()
    test_delete_role()
    test_delete_resource()
