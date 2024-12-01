// services/ResourceService.js

let resources = [];

export const addOrUpdateResource = (newResource) => {
  const index = resources.findIndex((res) => res.name === newResource.name);
  if (index !== -1) {
    resources[index] = newResource;
  } else {
    resources.push(newResource);
  }
};

export const deleteResource = (resourceName) => {
  resources = resources.filter((res) => res.name !== resourceName);
};

export const getResources = () => resources || [];
