#!/bin/sh

usage() {
	echo `basename $0`: ERROR: $* 1>&2
	echo usage: `basename $0` '  - Cleanup claudia roles  removing roles, and policies' 1>&2
	exit 1
}


#Initialization of variables
roleName="alexa-icloudtools-executor"
kmsRolePolicy="kms-access-json"
logRolePolicy="log-writer"


#Clean up Claudia
echo "***  Attempting to delete existing roles,policies, and aliases..(may see errors)."

rolepolicyexist=$(aws iam list-role-policies --role-name "$roleName" | grep "$kmsRolePolicy") >/dev/null 2>&1
if [ -z "$rolepolicyexist" ]; then
 echo "No role policies to delete\n"
else
 aws iam delete-role-policy --role-name "$roleName" --policy-name "$kmsRolePolicy"
 echo "$roleName policy has been removed"
fi

rolepolicyexist=$(aws iam list-role-policies --role-name "$roleName" | grep "$logRolePolicy") >/dev/null 2>&1
if [ -z "$rolepolicyexist" ]; then
 echo "No role policies to delete\n"
else
 aws iam delete-role-policy --role-name "$roleName" --policy-name "$logRolePolicy"
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

aws lambda delete-function --function-name alexa-icloudtools


echo "All done..."
