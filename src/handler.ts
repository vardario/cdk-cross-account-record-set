import { CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { Route53Client, ChangeResourceRecordSetsCommand, ResourceRecordSet } from '@aws-sdk/client-route-53';

import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
const stsClient = new STSClient();

export async function handler(event: CdkCustomResourceEvent): Promise<CdkCustomResourceResponse> {
  const PhysicalResourceId = `CrossAccountRecordSetHandler_${event.StackId}`;

  const records = JSON.parse(event.ResourceProperties.records) as ResourceRecordSet[];
  const iamRoleArn = event.ResourceProperties.iamRoleArn;
  const hostedZoneId = event.ResourceProperties.hostedZoneId;

  const stsResponse = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: iamRoleArn,
      RoleSessionName: 'CrossAccountRecordSet'
    })
  );

  if (stsResponse.Credentials === undefined) throw new Error('Credentials are undefined');

  const configRoute53Client = new Route53Client({
    credentials: {
      accessKeyId: stsResponse.Credentials.AccessKeyId!,
      secretAccessKey: stsResponse.Credentials.SecretAccessKey!,
      sessionToken: stsResponse.Credentials.SessionToken!
    }
  });

  if (event.RequestType === 'Create') {
    await configRoute53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: records.map(record => ({
            Action: 'UPSERT',
            ResourceRecordSet: record
          }))
        }
      })
    );
  }

  if (event.RequestType === 'Delete') {
    await configRoute53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: records.map(record => ({
            Action: 'DELETE',
            ResourceRecordSet: record
          }))
        }
      })
    );
  }

  return {
    PhysicalResourceId: PhysicalResourceId
  };
}
