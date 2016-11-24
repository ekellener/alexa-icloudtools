FROM ekellener/alexa-icloudtools-appbuild


#prereq
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION
ARG git_repo
ARG dev_test_device
ARG dev_test_user

ENV HOME=/home/app
USER app
WORKDIR $HOME/lambda/alexa-icloudtools

#add any changes from repo
RUN git pull

#Prereq Setup KMS
RUN aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
RUN aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
RUN aws configure set region $AWS_DEFAULT_REGION

#Set up KMS key
WORKDIR $HOME/lambda/alexa-icloudtools/bin
RUN ./setupkms.sh
WORKDIR $HOME/lambda/alexa-icloudtools/config
COPY config/creds.dcr $HOME/lambda/alexa-icloudtools/config
COPY config/dev.json $HOME/lambda/alexa-icloudtools/config
USER root
RUN chown app:app  $HOME/lambda/alexa-icloudtools/config/*
User app
RUN aws kms encrypt --key-id alias/alexa-icloud-kms --plaintext fileb://creds.dcr --output text --query CiphertextBlob | base64 --decode > creds.base64
#Deploy lambda via Claudia
WORKDIR $HOME/lambda/alexa-icloudtools
RUN npm test
RUN npm run claudia-create

#Run a full loop test pingDevice. Temp replace existing fixture w/ accurate test data
RUN cp test/fixtures/alexa-event-pingDevice.json test/fixtures/alexa-event-pingDevice-user.json
RUN js='this.ICloud.credentialStore.params.awsRegion='; node_modules/.bin/json -I -f config/dev.json -e $js\"${AWS_DEFAULT_REGION}\"
RUN js='this.request.intent.slots.FirstNames.value='; node_modules/.bin/json  -I -f test/fixtures/alexa-event-pingDevice-user.json -e $js${dev_test_user}
RUN     js='this.request.intent.slots.Device.value='; node_modules/.bin/json  -I -f test/fixtures/alexa-event-pingDevice-user.json -e $js${dev_test_device}
RUN npm run claudia-test -- test/fixtures/alexa-event-pingDevice-user.json

