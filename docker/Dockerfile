FROM node:14.4

# Required dependencies
RUN apt-get update && apt-get install -yq python3-pip less && pip3 install boto3 && curl -fsSL --compressed  "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip && unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install && npm install serverless -g

WORKDIR /home/node

# git checkout current repository
# RUN git clone https://github.com/awslabs/fhir-works-on-aws-deployment.git fhir-works-on-aws-deployment
# Temporary use local copy
RUN mkdir fhir-works-on-aws-deployment
COPY ./ ./fhir-works-on-aws-deployment/
RUN rm -rf ./fhir-works-on-aws-deployment/.build
RUN chown -R node:node .
RUN chmod 700 ./fhir-works-on-aws-deployment/scripts/install.sh

USER node
ENV DOCKER=true

ENTRYPOINT [ "fhir-works-on-aws-deployment/scripts/install.sh" ]
