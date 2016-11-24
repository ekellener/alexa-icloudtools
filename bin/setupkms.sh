#!/bin/sh

usage() {
	echo `basename $0`: ERROR: $* 1>&2
	echo usage: `basename $0` '[-cleanup-only]  - Only run cleanup phase, removing roles, aliases, and policies' 1>&2
	exit 1
}

#Initialize
c=0;

case "$1" in
	-clean-only) echo "*** Cleanup Phase Only"; c=1;;
	-*) usage "bad argument $1, use -clean-only";;
	 *) break;;

esac


#Initialization of variables
roleName="alexa-icloud-kms-accessor"
kmsRolePolicy="kms-access"
kmsKeyAlias="alexa-icloud-kms"
kmsPolicyDocument=`cat ./policies/kms-access.json`
trustpolicydocument=`cat ./policies/lambda-trustpolicy.json`
createpolicydocument="./policies/create-kms-policy.json"


# Gather current User's full ARN
echo "Extracting ARN and Account ID"
Arn=`aws sts get-caller-identity --query Arn |  sed 's/^"\(.*\)"$/\1/'`
# Gather user's account id
awsAccount=`aws sts get-caller-identity --query Account |  sed 's/^"\(.*\)"$/\1/'`


#echo "Validate variables"
#echo "Trust policy Doc"
#echo $trustpolicydocument
#echo "KMS Policy Doc"
#echo $kmsPolicyDocument
#echo "Trust Policy Doc"
#echo $trustpolicydocument
#echo "Role name"
#echo $roleName


#Clean up
echo "***  Attempting to delete existing roles,policies, and aliases..."
rolepolicyexist=$(aws iam list-role-policies --role-name "$roleName" | grep "$kmsRolePolicy") >/dev/null 2>&1
if [ -z "$rolepolicyexist" ]; then
 echo "No role policies to delete\n"
else
 aws iam delete-role-policy --role-name "$roleName" --policy-name "$kmsRolePolicy"
 echo "$roleName policy has been removed"
fi

# Delete main role (used for Claudia)
roleexists=$( aws iam list-roles | grep "role/$roleName\""  ) 2>&1
if [ -z "$roleexists" ]; then
 echo "No roles to delete"
else
aws iam delete-role --role-name "$roleName"
echo "$roleName role has been removed"
fi


# Delete KMS alias
aliasexist=$( aws kms list-aliases | grep "$kmsKeyAlias" ) 2>&1
if [ -z "$aliasexist" ]; then
    echo "No aliases to delete"
else
aws kms delete-alias --alias-name "alias/$kmsKeyAlias"
echo "Removed alias/$kmsKeyAlias alias"
fi
echo "***  Existing roles, policies and aliases have been removed"

if [ "$c" -eq 1 ]; then
 echo "Completed Clean-up Phase.. All Done"
 exit
fi


#Create role $roleName$
echo "Creating new role..."
newrolecreated=`aws iam create-role --role-name "$roleName" --assume-role-policy-document "$trustpolicydocument" | grep arn:aws | cut -d \" -f 4`

if [ -z "$newrolecreated" ]; then
   echo "Problem creating new role"
   exit
else
  echo "Role: [$newrolecreated] created"
fi


# Assign policy (kms access) to $roleName
aws iam put-role-policy --role-name "$roleName" --policy-name "$kmsRolePolicy" --policy-document "$kmsPolicyDocument"
if [ $? -eq 0 ]; then
  echo "Policy $kmsRolePolicy assigned to $roleName role"
else
  echo "Problem assigning policy to role... "
  exit;
fi


 #Confirm it's good
#echo "Quick confirmation of entities created"
#echo $Arn
#echo $awsAccount
#echo $newrolecreated


# Gather policy template and sub in variables
createpolicy=`sed 's~{awsAccount}~'"$awsAccount"'~g; s~{Arn}~'"$Arn"'~g; s~{Role}~'"$newrolecreated"'~g' "$createpolicydocument"`
if [ -z "$createpolicy" ]; then
  echo "Unable top process policy template**  $createpolicydocument"
  exit 1
else
  echo "Created new policy document from template"
fi

echo "Waiting.... 5 seconds to allow for propagation"
sleep 5

echo "Creating new CMK key..."
newkey=`aws kms create-key --policy "$createpolicy" | grep "arn:aws" | grep "arn:aws" | cut -d \" -f 4 | cut -d \/ -f 2`

if [ -z "$newkey" ]; then
  echo "Problem creating new CMK key"
  exit 1
else
 echo "New Key: $newkey created"
fi

echo "Waiting... 5 seconds to allow for propagation"
sleep 5
echo "Assigning Alias to Key: $newkey"
aws kms create-alias --alias-name "alias/$kmsKeyAlias" --target-key-id "$newkey"
if [ $? -eq 0 ]; then
 echo "New Alias: $kmsKeyAlias created and assigned"
else
 echo "Problem creating new CMK key"
fi

echo "All done..."
