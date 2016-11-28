<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [iCloud Tools for Alexa](#icloud-tools-for-alexa)
    - [Step 1 - Prerequisites](#step-1---prerequisites)
    - [Step 2 - Initial install](#step-2---initial-install)
    - [Step 3 - Configure](#step-3---configure)
      - [Alexa and iCloud (Naming conventions)](#alexa-and-icloud-naming-conventions)
    - [Step 4 - Deploy](#step-4---deploy)
    - [Step 5 - Set up Alexa Function](#step-5---set-up-alexa-function)
        - [Skill Information](#skill-information)
        - [Interaction Model](#interaction-model)
        - [Configuration](#configuration)
        - [Test](#test)
    - [Quick Start](#quick-start)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# iCloud Tools for Alexa
This Alexa app is designed to automate a series of tasks that leverage Apple's iCloud services

Supports
 * "Find My Phone"
 * "Reminders"

*Moar support coming soon*


Key dependencies:
* [ClaudiaJs] (https://claudiajs.com/) for deployment
* AWS KMS for encryption of Apple account password
* extends [node-find-apple-device](https://github.com/hongkongkiwi/node-find-apple-device#readme)
* Mocha, Sinon and Chai for unit and integration tests
* Docker for deployment testing
* AWS SDK and CLI


### Step 1 - Prerequisites
 - [AWS Account] (https://aws.amazon.com/getting-started/). Specifically, you'll need a [AWS ID Key and Access Secret](http://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html)
 - [AWS Developer access](https://developer.amazon.com/home.html) to create an Alexa skill 
 - [AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-set-up.html) installed and configured with 

If you have the above set up and want to do a quick start to deploy alexa-icloudtools, jump [here](#quick-start). Otherwise, continue on.
 
 
### Step 2 - Initial install
```
npm install
```

### Step 3 - Configure
Before, setting up iCloud credentials, review the following to better understand how device names, and user credentials need to conforrm to specific naming pattern.

#### Alexa and iCloud (Naming conventions)

__**Device naming conventions**__ 
In order for the integration with iCloud devices to work smoothly, the app makes some assumptions on the device and account naming conventions.

- iCloud Devices are named in the following pattern `<Name> <Device Type>`  (e.g. Willy's laptop) - The possessive is used when submitting request through Alexa (e.g. Find Willy's laptop)
- Device types are typical names (e.g. computer, laptop, Macbook, iPad, iWatch, iPhone,etc..)
- iCloud credentials (see below) have a __**key**__ that correspond's to the `<Name>`

Here's an example of a home with 3 accounts and a total of 4 devices.

| `<Name>`  | `<Device Type>` | `<Device Name>` |
|---|---|---|
| Willy | iPad | Willy's iPad |
| Charlie | Macbook | Charlie's Macbook |
| Charlie | Phone | Charlie's Phone |
| Slugworth | Laptop | Slugworth's Laptop|


The `name` field is used as a stem and assume's all devices tied to the iCloud account have that `name`. In this case,Charlie's iCloud account is tied to Charlie's Macbook" and "Charlie's Phone". 
This convention provides hints to Echo to know which iCloud accounts and devices need to be accessed. 

References and changing device names:
* Changing IOS device name: [link](http://www.idownloadblog.com/2014/08/13/how-to-change-iphone-name/)
* Changing OSX device name: [link](http://ccm.net/faq/36219-mac-os-x-change-the-name-of-your-device)


__**Configuring the app with Credentials**__

In order to access iCloud's network to reach devices, an account username (.e.g sometimes referred to as the Apple ID) and password is required. 
Credentials are stored in a JSON structure. The "key" is used to lookup a specific account (generally first name) of the owner of iCloud account. As a note, it's recommend to use iCloud's 2FA and generate a [application specific password](https://support.apple.com/en-us/HT204397). However, it will work with your account's standard iCloud password.
 
Here's an example of a Credentials JSON structure. ```/config/creds.dcr.sample```
```json
{
	"icloud_logins": [
	{   "key": "Willy",
	    "email": "Willy@Wonka.com",
	    "password": "GoodDeedInAWearyWorld"
	}
	]
}
```

Note: *multiple logins can be added to the structure. This is valuable if you have multiple device owners in your home tied to separate iCloud accounts (e.g. families).* <br><br> 

The credentials can be stored in a file as a plaintext (ugh), or encrypted using the AWS KMS service (recommended).  The environment config file (e.g. default */config/dev.json*) specifies the location of the credentials, as well as how they are stored. 


Now back to Step 3 - Configure

If you'd prefer to use the [quick start](#quick-start) option which uses docker to provision and deploy the app, jump to Step 6. 


To configure a **dev** environment where credentials are stored as a **plain text** in the file **creds.dcr** (located in /config)

*Snippet of dev.json
```
...
"ICloud": {
    "credentialStore": {
      "adapter": "plainTxtCredentials",
      "params": {
       "credsFile": "./creds.dcr"
      }
    } 
...


```

similarly, to configure a **stage** environment where credentials are encrypted with **KMS** in the file **creds.base64** (located in /config

update stage.json
```javascript
"ICloud": {
    "credentialStore": {
      "adapter": "kmsCredentials",
      "params": {
       "awsRegion": "us-east-1",
       "encryptedFile": "./creds.base64"
      }
    } 
...
...
```

Now update the **config/dev.json** file.


If you plan to use plain-text to store the credentials, then skip to Step 4.

First, verify that a key alias doesn't already exist
```aws kms list-aliases```

If there is no usable key, you'll need to generate one. In the ./bin directory, run the script ./setupKms.sh. The output should look something like this.
```shell
policy has been removed
alexa-icloud-executor role has been removed
Removed alias/alexa-icloud-kms alias
***  Existing roles, policies and aliases have been removed
Creating new role...
Role: [arn:aws:iam::753001231152:role/alexa-icloud-executor] created
Policy kms-access assigned to alexa-icloud-executor role
Created new policy document from template
Waiting.... 5 seconds to allow for propagation
Creating new CMK key...
New Key: 033bd018-98df-4ab4-ac9f-312cf97e1ddf created
Waiting... 5 seconds to allow for propagation
Assigning Alias to Key: 033bd018-98df-4ab4-ac9f-312cf97e1ddf
New Alias: alexa-icloud-kms created and assigned
All done...
```

Running list-aliases again, should yield something like
```

{
    "Aliases": [
        {
            "AliasArn": "arn:aws:kms:us-east-1:012345676:alias/alexa-icloud-kms", 
            "AliasName": "alias/alexa-icloud-kms", 
            "TargetKeyId": "033bd018-98df-4ab4-ac9f-3f97e1ddf"
        }, 
...



```

The last step is to encrypt the credentials file. 

In order to encrypt the file "*creds.dcr*" using the key alias "*alexa-icloud-kms*" resulting in "*creds.base64*", use the following example.

Example to encrypt :
```
aws kms encrypt --key-id alias/alexa-icloud-kms --plaintext fileb://config/creds.dcr --output text --query CiphertextBlob | base64 --decode > config/creds.base64
```

Optionally, to confirm everything works, try

Example to decrypt :
```
aws kms decrypt --ciphertext-blob fileb://config/creds.base64 --output text --query Plaintext | base64 --decode > config/creds.dcr
```

Now that you have updated the config file and have created an encrypted version of the iCloud credential, you're ready to to deploy.


### Step 4 - Deploy
Deployment uses [Claudia](https://claudiajs.com/). There's already a npm wrapper available. Just enter ```npm run claudia-create```
This only needs to be done once..Subsequent deploys use ```npm run claudia-update```

After running, ```npm run claudia-create```,the output should look something like:

```
***  Attempting to delete existing roles,policies, and aliases..(may see errors during cleanup).
alexa-icloudtools-executor policy has been removed
alexa-icloudtools-executor policy has been removed
alexa-icloudtools-executor role has been removed
All done...
saving configuration
{
  "lambda": {
    "role": "alexa-icloudtools-executor",
    "name": "alexa-icloudtools",
    "region": "us-east-1"
  },
  "archive": "/tmp/df624853-4759-4ad3-9492-6f1de6cc93af.zip"
```

That's it. You can check in the AWS console under lambda functions to find the alexa-icloudtools function.


### Step 5 - Set up Alexa Function

Now that the lambda function has been deployed, the Alexa skill needs to be set up through the developer console.

1. https://developer.amazon.com/edw/home.html#/
2. Alexa -> Alexa Skill Kit->Add a New Skill
3. Create a New Skill

##### Skill Information
1. Skill Type: Custom Interaction Model
2. Name: <Pick a name>
3. Invocation Name: <Pick an invocation name>  -> Next

##### Interaction Model
1. Intent Schema (paste from ```/deploy/alexa/intent_schema.json```)
2. Add LIST_OF_DEVICES as a Custom Slot Type ->(paste from ```/deploy/alexa/custom_slot_type_LIST_OF_DEVICES```
3. Add LIST_OF_REMINDERS as a Custom Slot Type ->(PASTE FROM ```/deploy/alexa/custom_slot_type_LIST_OF_REMINDERS```
4. Utterances (paste from ```/deploy/alexa/utterances.txt```)

##### Configuration
1. Service Endpoint Type -> AWS Lambda ARN(Amazon Resource Name) (e.g. Lambda function)
2. Enter the ARN. The ARN is the id for the lambda function deployed through claudia. The ARN can be retrieved through this command:
```aws lambda list-functions --query 'Functions[?FunctionName==`alexa-icloudtools`].FunctionArn'```

##### Test
* Try it out... Service Simulator -> Text  - "Find <your user key's name> <device>'" (e.g. Find Willy's phone').
* If all works out, you should get an alert to your device.




### Quick Start
If you have Docker set up and want to spin up a full environment, including encrypted iCloud logins, follow these steps:

(Note: after the environment is set up, the build will ping the device specified in the .env (dev_test_user and dev_test_device to verify it's working)

1. Set up .env file: Make a copy of the **deploy/docker/.env.sample** file (in the same directory) and name it **.env**. Now, populate it with the correct AWS ID key & secret, region, icloud user key and device type.
2. Set up creds.dcr: Make a copy of the deploy/docker/config/creds.dcr.sample file, and add your icloud credentials.
3. Set up dev.json: Make a copy of the **deploy/docker/dev.json.sample/customize or make any changes to the /deploy/docker/config/dev.json file (The defaults should work just fine).
4. ```docker-compose build --no-cache```

