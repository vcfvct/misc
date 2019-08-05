import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, 'VPC', {
      cidr: '172.30.0.0/16',
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Application',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ]
    });

    const mySecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow ssh access to ec2 instances',
      allowAllOutbound: true   // Can be set to false
    });
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow http from the world');
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'allow https from the world');
    mySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'allow outbound');

    const instance = new ec2.CfnInstance(this, 'CccgEc2', {
      imageId: 'ami-07d0cf3af28718ef8',
      instanceType: 't2.micro',
      keyName: 'id_rsa',
      monitoring: false,
      securityGroupIds: [
        mySecurityGroup.securityGroupId
      ],
      subnetId: vpc.publicSubnets[0].subnetId,
      //iamInstanceProfile: 'ec2-role'
    });

    const eip = new ec2.CfnEIP(this, 'eip', {
    })

    new ec2.CfnEIPAssociation(this, 'ea', {
      eip: eip.ref,
      instanceId: instance.ref
    })
  }
}
