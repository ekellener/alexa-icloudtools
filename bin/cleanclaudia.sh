#!/bin/sh

usage() {
	echo `basename $0`: ERROR: $* 1>&2
	echo usage: `basename $0` '  - Cleanup claudia roles  removing roles, and policies' 1>&2
	exit 1
}


#Initialization of variables
roleName="alexa-icloudtools-executor"

#Clean up Claudia
echo "***  Attempting to delete existing roles,policies, and aliases..(may see errors)."

roles=$(aws iam list-roles --query 'Roles[?RoleName==`'$roleName'`].RoleName' --output text)
for role in $roles; do
  echo deleting policies for role $role
  policies=$(aws iam list-role-policies --role-name=$role --query PolicyNames --output text)
  for policy in $policies; do 
    echo deleting policy $policy for role $role
    aws iam delete-role-policy --policy-name $policy --role-name $role
  done
  echo deleting role $role
  aws iam delete-role --role-name $role
done

aws lambda delete-function --function-name alexa-icloudtools


echo "All done..."
