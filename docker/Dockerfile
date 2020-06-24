FROM node:14.4

RUN apt-get update && apt-get install -yq less

# Required dependencies
RUN curl -fsSL --compressed  "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip && unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install && npm install serverless -g

WORKDIR /home/node

# git checkout current repository
# RUN git clone https://github.com/awslabs/aws-fhir-solution.git aws-fhir-solution
# Temporary use local copy
RUN mkdir aws-fhir-solution
COPY ./ ./aws-fhir-solution/
RUN chown -R node:node .

USER node
ENV DOCKER=true

ENTRYPOINT [ "aws-fhir-solution/scripts/install.sh" ]
# CMD [ "aws-fhir-solution/scripts/install.sh" ]
