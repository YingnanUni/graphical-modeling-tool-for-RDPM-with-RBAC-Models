# Role Resource Management System

A React-based role and resource management system for managing organizational roles, resource allocation, and task workflows.

## Key Features

### Role Management
- Create, edit and delete roles
- Set role hierarchies
- Manage role permissions
- Configure mutually exclusive roles 
- Batch operations

### Resource Management
- Add, edit and delete resources
- Resource status management (available/occupied)
- Resource allocation tracking
- Shared resource support

### Task Workflow Management
- Visual BPMN task flow editor
- Support for sequential and parallel task modes
- Task property configuration
- Resource allocation validation
- Real-time task monitoring

### Pattern Management
- Predefined task templates
- Custom task patterns
- Pattern import/export
- Pattern validation

## Tech Stack

- React
- Redux Toolkit
- Ant Design
- BPMN.js
- Axios

## Installation
bash

# Install dependencies
npm install

# Start development server
npm start


## API Service

The project requires backend API support, default API address: http://127.0.0.1:8000


## Core Features

1. Role-Based Access Control (RBAC)
2. Flexible resource allocation mechanism
3. Visual task workflow management
4. Real-time status monitoring
5. Comprehensive data validation
6. Responsive design

## Usage Guide

1. First create required roles in the "Role Management" tab
2. Add available resources in the "Resource Management" tab
3. Use the "Change Pattern" feature to create task workflows
4. Assign roles and resources to tasks
5. Use the task tree monitor to track task status

## Key Components

### ChangePatternEditor
- BPMN-based graphical workflow editor
- Task property management
- Resource allocation interface

### TaskTreeMonitor
- Real-time task chain monitoring
- Resource allocation visualization
- Status tracking

### RoleManager
- Role hierarchy management
- Permission configuration
- Role-resource relationship management

### ResourceManager
- Resource status management
- Resource allocation tracking
- Availability monitoring

## State Management

The application uses Redux Toolkit for state management with the following main slices:
- roleSlice: Role management
- resourceSlice: Resource management
- patternSlice: Pattern management
- roleResourceSlice: Role-resource relationships




