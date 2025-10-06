import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// Get configuration
const config = new pulumi.Config();
const projectName = 'eat-sheet';
const environment = pulumi.getStack(); // dev, staging, prod

// Create Cognito User Pool
const userPool = new aws.cognito.UserPool(`${projectName}-users-${environment}`, {
  name: `${projectName}-users-${environment}`,

  // Sign-in options
  usernameAttributes: ['email'],
  autoVerifiedAttributes: ['email'],

  // Password policy
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 7,
  },

  // MFA configuration (disabled for MVP, can enable later)
  mfaConfiguration: 'OFF',

  // Account recovery
  accountRecoverySetting: {
    recoveryMechanisms: [
      {
        name: 'verified_email',
        priority: 1,
      },
    ],
  },

  // Required attributes
  schemas: [
    {
      name: 'email',
      attributeDataType: 'String',
      required: true,
      mutable: false,
    },
    {
      name: 'name',
      attributeDataType: 'String',
      required: true,
      mutable: true,
    },
  ],

  // Email configuration (using Cognito default for now)
  emailConfiguration: {
    emailSendingAccount: 'COGNITO_DEFAULT',
  },

  // Admin create user config
  adminCreateUserConfig: {
    allowAdminCreateUserOnly: false, // Allow self-service sign-up
  },

  // User pool add-ons
  userPoolAddOns: {
    advancedSecurityMode: 'OFF', // Can enable for additional security
  },

  // Tags
  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'Pulumi',
  },
});

// Create User Pool Client (for web app)
const userPoolClient = new aws.cognito.UserPoolClient(`${projectName}-web-client-${environment}`, {
  name: `${projectName}-web-${environment}`,
  userPoolId: userPool.id,

  // Auth flows
  explicitAuthFlows: [
    'ALLOW_USER_PASSWORD_AUTH',
    'ALLOW_REFRESH_TOKEN_AUTH',
    'ALLOW_USER_SRP_AUTH',
  ],

  // Token validity
  accessTokenValidity: 1, // 1 hour
  idTokenValidity: 1, // 1 hour
  refreshTokenValidity: 30, // 30 days
  tokenValidityUnits: {
    accessToken: 'hours',
    idToken: 'hours',
    refreshToken: 'days',
  },

  // OAuth settings (can configure later for social login)
  generateSecret: false, // Public client (web/mobile apps don't need secrets)

  // Prevent user existence errors
  preventUserExistenceErrors: 'ENABLED',

  // Read/write attributes
  readAttributes: ['email', 'name'],
  writeAttributes: ['name'],
});

// Create User Pool Domain (for hosted UI - optional for MVP)
const userPoolDomain = new aws.cognito.UserPoolDomain(`${projectName}-auth-${environment}`, {
  domain: `${projectName}-${environment}`,
  userPoolId: userPool.id,
});

// Export values for use in backend
export const cognitoUserPoolId = userPool.id;
export const cognitoUserPoolArn = userPool.arn;
export const cognitoClientId = userPoolClient.id;
export const cognitoRegion = aws.config.region;
export const cognitoUserPoolEndpoint = userPool.endpoint;
export const cognitoDomain = pulumi.interpolate`${userPoolDomain.domain}.auth.${aws.config.region}.amazoncognito.com`;

// Export for easy configuration
export const backendEnvVars = pulumi.interpolate`
COGNITO_USER_POOL_ID=${userPool.id}
COGNITO_REGION=${aws.config.region}
COGNITO_CLIENT_ID=${userPoolClient.id}
`;