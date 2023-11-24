import { Construct } from 'constructs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCustomResource } from './utils.js';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ResourceRecordSet } from '@aws-sdk/client-route-53';

export interface CdkCrossAccountRecordSetProps {
  hostedZoneId: string;
  iamRoleArn: string;
  records: ResourceRecordSet[];
}

export class CdkCrossAccountRecordSet extends Construct {
  constructor(scope: Construct, id: string, props: CdkCrossAccountRecordSetProps) {
    super(scope, id);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    createCustomResource({
      properties: {
        records: JSON.stringify(props.records),
        iamRoleArn: props.iamRoleArn,
        hostedZoneId: props.hostedZoneId
      },
      lambdaProps: {
        description: 'Creates a Route53 Record Set with an IAM Role in another account.',
        timeout: cdk.Duration.seconds(30)
      },
      handlerPath: path.resolve(__dirname, './handler.js'),
      name: 'CrossAccountRecordSet',
      scope: this,
      policyStatements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [props.iamRoleArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['route53:ChangeResourceRecordSets'],
          resources: ['*']
        })
      ]
    });
  }
}
