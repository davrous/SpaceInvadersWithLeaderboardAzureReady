// Main Bicep template for Space Invaders game deployment
// Deploys Azure App Service with supporting resources

targetScope = 'resourceGroup'

@minLength(1)
@maxLength(64)
@description('Name of the environment used for resource naming')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Service name for the App Service - must match azure.yaml')
param appServiceName string = 'space-invaders-app'

@description('App Service Plan SKU')
@allowed(['B1', 'B2', 'S1', 'P1V2'])
param appServicePlanSku string = 'B1'

@description('Node.js version')
param nodeVersion string = '22-lts'

// Generate a unique resource token for naming
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location, environmentName)

// Resource name prefixes (3 chars max, alphanumeric only)
var appServicePlanPrefix = 'asp'
var appServicePrefix = 'app'
var appInsightsPrefix = 'ai'
var logAnalyticsPrefix = 'log'
var keyVaultPrefix = 'kv'
var managedIdentityPrefix = 'id'

// Generate resource names following Azure naming conventions
var appServicePlanName = '${appServicePlanPrefix}${resourceToken}'
var appServiceResourceName = '${appServicePrefix}${resourceToken}'
var appInsightsName = '${appInsightsPrefix}${resourceToken}'
var logAnalyticsName = '${logAnalyticsPrefix}${resourceToken}'
var keyVaultName = '${keyVaultPrefix}${resourceToken}'
var managedIdentityName = '${managedIdentityPrefix}${resourceToken}'

// Tags
var tags = {
  'azd-env-name': environmentName
}

var appServiceTags = union(tags, {
  'azd-service-name': appServiceName
})

// ============================================================================
// User-Assigned Managed Identity (Required by AZD)
// ============================================================================
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
  tags: tags
}

// ============================================================================
// Log Analytics Workspace
// ============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================================================
// Application Insights
// ============================================================================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
  }
}

// ============================================================================
// Azure Key Vault
// ============================================================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    enablePurgeProtection: true // Required: DO NOT disable purge protection
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: managedIdentity.properties.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
      {
        tenantId: subscription().tenantId
        objectId: 'ed1229c9-ae47-4b80-aa17-e7ea60683f35' // Current user for setup
        permissions: {
          secrets: [
            'get'
            'list'
            'set'
            'delete'
          ]
        }
      }
    ]
  }
}

// ============================================================================
// App Service Plan
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
}

// ============================================================================
// App Service (Web App)
// ============================================================================
resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceResourceName
  location: location
  tags: appServiceTags // Include azd-service-name tag
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true // Force HTTPS
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      appCommandLine: 'node server/server.js'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~${nodeVersion}'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_AI_LEVELS'
          value: 'true'
        }
        {
          name: 'AI_MODEL'
          value: 'openai/gpt-4.1-mini'
        }
        {
          name: 'AI_ENDPOINT'
          value: 'https://models.github.ai/inference'
        }
        {
          name: 'DATABASE_PATH'
          value: '/home/data/leaderboard.db'
        }
        {
          name: 'CALLBACK_URL'
          value: 'https://${appServiceResourceName}.azurewebsites.net'
        }
        // Key Vault references for secrets
        {
          name: 'SESSION_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=SESSION-SECRET)'
        }
        {
          name: 'GITHUB_CLIENT_ID'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=GITHUB-CLIENT-ID)'
        }
        {
          name: 'GITHUB_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=GITHUB-CLIENT-SECRET)'
        }
        {
          name: 'GOOGLE_CLIENT_ID'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=GOOGLE-CLIENT-ID)'
        }
        {
          name: 'GOOGLE_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=GOOGLE-CLIENT-SECRET)'
        }
        {
          name: 'MICROSOFT_CLIENT_ID'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=MICROSOFT-CLIENT-ID)'
        }
        {
          name: 'MICROSOFT_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=MICROSOFT-CLIENT-SECRET)'
        }
        {
          name: 'GITHUB_TOKEN'
          value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=GITHUB-TOKEN)'
        }
      ]
    }
  }
}

// ============================================================================
// Outputs (Required by AZD)
// ============================================================================
output RESOURCE_GROUP_ID string = resourceGroup().id
output APP_SERVICE_NAME string = appService.name
output APP_SERVICE_URL string = 'https://${appService.properties.defaultHostName}'
output KEY_VAULT_NAME string = keyVault.name
output KEY_VAULT_URI string = keyVault.properties.vaultUri
output APPLICATIONINSIGHTS_CONNECTION_STRING string = appInsights.properties.ConnectionString
output MANAGED_IDENTITY_CLIENT_ID string = managedIdentity.properties.clientId
output MANAGED_IDENTITY_PRINCIPAL_ID string = managedIdentity.properties.principalId
