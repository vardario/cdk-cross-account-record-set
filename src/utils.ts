import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CreateCustomResourceParams {
  handlerPath: string;
  lambdaProps?: lambda.FunctionOptions;
  name: string;
  policyStatements?: iam.PolicyStatement[];
  properties?: Record<string, string>;
  scope: Construct;
}

export function createCustomResource({
  handlerPath,
  policyStatements,
  name,
  scope,
  properties,
  lambdaProps
}: CreateCustomResourceParams) {
  const accountNameFn = new lambdaNode.NodejsFunction(scope, `${name}_EventHandler`, {
    entry: handlerPath,
    timeout: cdk.Duration.seconds(15),
    runtime: lambda.Runtime.NODEJS_18_X,
    memorySize: 512,
    ...lambdaProps
  });

  policyStatements?.forEach(statement => accountNameFn.addToRolePolicy(statement));

  const provider = new cdk.custom_resources.Provider(scope, `${name}_Provider`, {
    onEventHandler: accountNameFn
  });

  return new cdk.CustomResource(scope, name, {
    serviceToken: provider.serviceToken,
    properties
  });
}
