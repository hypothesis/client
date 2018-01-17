FROM node:carbon

#RUN addgroup -S hypothesis && adduser -S -G hypothesis -h /usr/src/app hypothesis
WORKDIR /usr/src/app

ARG SIDEBAR_APP_URL
ARG CLIENT_URL
ARG ASSET_URL

# Copy the source files.
COPY . .

# Ensure directories writeable by unprivileged user.
#RUN chown -R hypothesis:hypothesis *

# Install dependencies.
RUN NODE_ENV=production node --max_semi_space_size=1 --max_old_space_size=198 --optimize_for_size \
      `which npm` install

RUN npm install -g gulp-cli

RUN make

#USER hypothesis

CMD ["gulp", "serve-package"]
