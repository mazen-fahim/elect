# frontend/Dockerfile.dev
# We base our docker image on the latest Node.js image.
FROM node:latest

# We set the working directory to /app. (inside the container)
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory (/app).
COPY package*.json ./

# install the dependencies defined in package.json.
RUN npm install

# Here we copy the rest of the application code to the working directory.
# We did this after installing the dependencies so that we can take advantage of Docker's caching mechanism.
# so if we change the code, it will not re-run the npm install command unless package.json or package-lock.json changes.
COPY . .

# This doesn't actually expose the port, but it is a good practice to document which port the app runs on.
# The thing that actually exposes the port is done in the docker-compose.yml file.
EXPOSE 3000

# run the development server.
CMD ["npm", "run", "dev", "--", "--port", "3000", "--host", "0.0.0.0"]

