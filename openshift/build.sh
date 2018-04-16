#!/bin/sh

# Clean house before a build.
rm -rf node_modules
make clean

# Install yarn and gulp
NODE_ENV=production npm install -g yarn gulp-cli

# Build the project
NODE_ENV=production node --max_semi_space_size=1 --max_old_space_size=198 --optimize_for_size `which npm` install
make

# Start the service.
gulp watch