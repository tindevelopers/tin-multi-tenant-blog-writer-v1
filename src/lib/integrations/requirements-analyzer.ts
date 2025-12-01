/**
 * Integration Requirements Analyzer
 * 
 * This service analyzes and validates the specific credentials and configuration
 * requirements for each publishing system integration. It provides:
 * - Required credential fields for each provider
 * - Validation rules specific to each system
 * - Field mapping requirements
 * - Publishing-specific requirements
 * 
 * This abstraction layer ensures that each integration is properly configured
 * before attempting to publish content.
 */

import type { IntegrationType, ConnectionConfig, ConfigField, ValidationResult, FieldMapping } from './types';

export interface ProviderRequirements {
  provider: IntegrationType;
  displayName: string;
  description: string;
  requiredFields: ConfigField[];
  optionalFields: ConfigField[];
  connectionMethods: ('api_key' | 'oauth')[];
  publishingRequirements: PublishingRequirements;
  fieldMappingRequirements: FieldMappingRequirement[];
  validationRules: ValidationRule[];
}

export interface PublishingRequirements {
  requiredFields: string[];
  optionalFields: string[];
  contentFormats: ('html' | 'markdown' | 'plain-text')[];
  supportedMediaTypes: string[];
  maxContentLength?: number;
  specialRequirements?: string[];
}

export interface FieldMappingRequirement {
  blogField: string;
  targetField: string;
  required: boolean;
  description: string;
  transform?: {
    type: 'html-to-markdown' | 'markdown-to-html' | 'date-format' | 'custom';
    config?: Record<string, unknown>;
  };
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'length' | 'pattern' | 'custom';
  value?: string | number;
  pattern?: string;
  message: string;
  validator?: (value: unknown, config: ConnectionConfig) => boolean;
}

/**
 * Webflow-specific requirements
 * 
 * Webflow blog posting is very precise and requires:
 * 1. API Key (from Webflow Account Settings → Integrations → API Access)
 * 2. Collection ID (the CMS collection where blog posts will be published)
 * 3. Proper field mapping (Webflow collections have specific field structures)
 * 4. Content must be formatted as HTML
 * 5. Images must be uploaded separately and referenced by URL
 */
const WEBFLOW_REQUIREMENTS: ProviderRequirements = {
  provider: 'webflow',
  displayName: 'Webflow',
  description: 'Publish blog posts directly to your Webflow CMS collection with custom styling and responsive design.',
  requiredFields: [
    {
      key: 'api_key',
      label: 'Webflow API Key',
      type: 'password',
      required: true,
      description: 'Your Webflow API key from Account Settings → Integrations → API Access',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validation: {
        // Webflow API v2 tokens can be UUIDs or longer bearer tokens
        minLength: 32,
        maxLength: 256,
      },
    },
    {
      key: 'collection_id',
      label: 'Collection ID',
      type: 'text',
      required: true,
      description: 'The Collection ID of your Webflow CMS collection where blog posts will be published',
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
      validation: {
        minLength: 20,
        maxLength: 32,
      },
    },
  ],
  optionalFields: [
    {
      key: 'site_id',
      label: 'Site ID',
      type: 'text',
      required: false,
      description: 'Optional: Your Webflow site ID for additional site-specific operations',
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],
  connectionMethods: ['api_key', 'oauth'],
  publishingRequirements: {
    requiredFields: ['title', 'content', 'slug'],
    optionalFields: ['excerpt', 'featured_image', 'published_at', 'author', 'tags', 'categories'],
    contentFormats: ['html'],
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxContentLength: 1000000, // 1MB limit for Webflow CMS items
    specialRequirements: [
      'Content must be valid HTML',
      'Images must be uploaded separately and referenced by URL',
      'Slug must be unique within the collection',
      'Date fields must be in ISO 8601 format',
      'Rich text fields support HTML formatting',
    ],
  },
  fieldMappingRequirements: [
    {
      blogField: 'title',
      targetField: 'name', // Webflow uses 'name' for the title field
      required: true,
      description: 'The blog post title',
    },
    {
      blogField: 'content',
      targetField: 'post-body', // Common Webflow field name for blog content
      required: true,
      description: 'The main blog post content (HTML format)',
      transform: {
        type: 'html-to-markdown', // May need conversion depending on source
      },
    },
    {
      blogField: 'slug',
      targetField: 'slug',
      required: true,
      description: 'URL-friendly slug for the blog post',
    },
    {
      blogField: 'excerpt',
      targetField: 'post-summary',
      required: false,
      description: 'Short excerpt or summary of the blog post',
    },
    {
      blogField: 'featured_image',
      targetField: 'post-image',
      required: false,
      description: 'Featured image URL for the blog post',
    },
    {
      blogField: 'published_at',
      targetField: 'publish-date',
      required: false,
      description: 'Publication date (ISO 8601 format)',
      transform: {
        type: 'date-format',
        config: { format: 'ISO8601' },
      },
    },
  ],
  validationRules: [
    {
      field: 'api_key',
      type: 'pattern',
      pattern: '^wf_[A-Za-z0-9]{32,}$',
      message: 'Webflow API key must start with "wf_" followed by alphanumeric characters',
      validator: (value) => {
        if (typeof value !== 'string') return false;
        return /^wf_[A-Za-z0-9]{32,}$/.test(value);
      },
    },
    {
      field: 'collection_id',
      type: 'pattern',
      pattern: '^[A-Za-z0-9]{24}$',
      message: 'Collection ID must be exactly 24 alphanumeric characters',
      validator: (value) => {
        if (typeof value !== 'string') return false;
        return /^[A-Za-z0-9]{24}$/.test(value);
      },
    },
    {
      field: 'collection_id',
      type: 'required',
      message: 'Collection ID is required for Webflow blog posting',
      validator: (value) => {
        return value !== undefined && value !== null && value !== '';
      },
    },
  ],
};

/**
 * WordPress-specific requirements
 */
const WORDPRESS_REQUIREMENTS: ProviderRequirements = {
  provider: 'wordpress',
  displayName: 'WordPress',
  description: 'Publish content directly to your WordPress website with automatic formatting.',
  requiredFields: [
    {
      key: 'siteUrl',
      label: 'WordPress Site URL',
      type: 'url',
      required: true,
      description: 'The base URL of your WordPress site (e.g., https://example.com)',
      placeholder: 'https://example.com',
      validation: {
        pattern: '^https?://.+',
      },
    },
    {
      key: 'username',
      label: 'WordPress Username',
      type: 'text',
      required: true,
      description: 'WordPress username for API authentication',
      placeholder: 'admin',
    },
    {
      key: 'applicationPassword',
      label: 'Application Password',
      type: 'password',
      required: true,
      description: 'Application password generated in WordPress (Users → Profile → Application Passwords)',
      placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
      validation: {
        pattern: '^[A-Za-z0-9]{4}( [A-Za-z0-9]{4}){5}$',
      },
    },
  ],
  optionalFields: [
    {
      key: 'category',
      label: 'Default Category',
      type: 'text',
      required: false,
      description: 'Default WordPress category for published posts',
    },
  ],
  connectionMethods: ['api_key'],
  publishingRequirements: {
    requiredFields: ['title', 'content'],
    optionalFields: ['excerpt', 'featured_image', 'published_at', 'author', 'tags', 'categories', 'slug'],
    contentFormats: ['html', 'markdown'],
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    specialRequirements: [
      'Content can be HTML or Markdown (will be converted to HTML)',
      'Images can be uploaded via WordPress REST API',
      'Categories and tags are created automatically if they don\'t exist',
    ],
  },
  fieldMappingRequirements: [
    {
      blogField: 'title',
      targetField: 'title',
      required: true,
      description: 'The blog post title',
    },
    {
      blogField: 'content',
      targetField: 'content',
      required: true,
      description: 'The main blog post content',
    },
    {
      blogField: 'excerpt',
      targetField: 'excerpt',
      required: false,
      description: 'Short excerpt of the blog post',
    },
  ],
  validationRules: [
    {
      field: 'siteUrl',
      type: 'required',
      message: 'WordPress site URL is required',
    },
    {
      field: 'username',
      type: 'required',
      message: 'WordPress username is required',
    },
    {
      field: 'applicationPassword',
      type: 'required',
      message: 'Application password is required',
    },
  ],
};

/**
 * Shopify-specific requirements
 */
const SHOPIFY_REQUIREMENTS: ProviderRequirements = {
  provider: 'shopify',
  displayName: 'Shopify',
  description: 'Publish blog posts to your Shopify store blog.',
  requiredFields: [
    {
      key: 'storeName',
      label: 'Shopify Store Name',
      type: 'text',
      required: true,
      description: 'Your Shopify store name (e.g., "mystore" for mystore.myshopify.com)',
      placeholder: 'mystore',
    },
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      description: 'Shopify Admin API access token',
      placeholder: 'shpat_xxxxxxxxxxxxxxxx',
    },
  ],
  optionalFields: [
    {
      key: 'blogId',
      label: 'Blog ID',
      type: 'text',
      required: false,
      description: 'Specific blog ID if you have multiple blogs',
    },
  ],
  connectionMethods: ['api_key', 'oauth'],
  publishingRequirements: {
    requiredFields: ['title', 'content'],
    optionalFields: ['excerpt', 'featured_image', 'published_at', 'author', 'tags'],
    contentFormats: ['html'],
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif'],
    specialRequirements: [
      'Content must be HTML',
      'Shopify uses blog articles, not posts',
      'Images must be uploaded to Shopify assets',
    ],
  },
  fieldMappingRequirements: [
    {
      blogField: 'title',
      targetField: 'title',
      required: true,
      description: 'The blog article title',
    },
    {
      blogField: 'content',
      targetField: 'body_html',
      required: true,
      description: 'The blog article content (HTML)',
    },
  ],
  validationRules: [
    {
      field: 'storeName',
      type: 'required',
      message: 'Shopify store name is required',
    },
    {
      field: 'accessToken',
      type: 'required',
      message: 'Access token is required',
    },
  ],
};

/**
 * Requirements registry
 */
const REQUIREMENTS_REGISTRY: Record<IntegrationType, ProviderRequirements> = {
  webflow: WEBFLOW_REQUIREMENTS,
  wordpress: WORDPRESS_REQUIREMENTS,
  shopify: SHOPIFY_REQUIREMENTS,
  medium: {
    provider: 'medium',
    displayName: 'Medium',
    description: 'Publish to Medium',
    requiredFields: [],
    optionalFields: [],
    connectionMethods: ['oauth'],
    publishingRequirements: {
      requiredFields: ['title', 'content'],
      optionalFields: [],
      contentFormats: ['markdown', 'html'],
      supportedMediaTypes: [],
    },
    fieldMappingRequirements: [],
    validationRules: [],
  },
  'google-analytics': {
    provider: 'google-analytics',
    displayName: 'Google Analytics',
    description: 'Track website analytics',
    requiredFields: [],
    optionalFields: [],
    connectionMethods: ['oauth'],
    publishingRequirements: {
      requiredFields: [],
      optionalFields: [],
      contentFormats: [],
      supportedMediaTypes: [],
    },
    fieldMappingRequirements: [],
    validationRules: [],
  },
  slack: {
    provider: 'slack',
    displayName: 'Slack',
    description: 'Slack integration',
    requiredFields: [],
    optionalFields: [],
    connectionMethods: ['oauth'],
    publishingRequirements: {
      requiredFields: [],
      optionalFields: [],
      contentFormats: [],
      supportedMediaTypes: [],
    },
    fieldMappingRequirements: [],
    validationRules: [],
  },
  zapier: {
    provider: 'zapier',
    displayName: 'Zapier',
    description: 'Zapier integration',
    requiredFields: [],
    optionalFields: [],
    connectionMethods: ['api_key'],
    publishingRequirements: {
      requiredFields: [],
      optionalFields: [],
      contentFormats: [],
      supportedMediaTypes: [],
    },
    fieldMappingRequirements: [],
    validationRules: [],
  },
  hubspot: {
    provider: 'hubspot',
    displayName: 'HubSpot',
    description: 'HubSpot integration',
    requiredFields: [],
    optionalFields: [],
    connectionMethods: ['oauth'],
    publishingRequirements: {
      requiredFields: [],
      optionalFields: [],
      contentFormats: [],
      supportedMediaTypes: [],
    },
    fieldMappingRequirements: [],
    validationRules: [],
  },
};

/**
 * Integration Requirements Analyzer Service
 */
export class IntegrationRequirementsAnalyzer {
  /**
   * Get requirements for a specific provider
   */
  static getRequirements(provider: IntegrationType): ProviderRequirements {
    const requirements = REQUIREMENTS_REGISTRY[provider];
    if (!requirements) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return requirements;
  }

  /**
   * Analyze and validate a connection configuration
   */
  static analyzeConfiguration(
    provider: IntegrationType,
    config: ConnectionConfig
  ): ValidationResult & { missingFields: string[]; warnings: string[] } {
    const requirements = this.getRequirements(provider);
    const errors: Record<string, string> = {};
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of requirements.requiredFields) {
      const value = config[field.key as keyof ConnectionConfig];
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field.key] = `${field.label} is required`;
        missingFields.push(field.key);
        continue;
      }

      // Apply validation rules
      for (const rule of requirements.validationRules) {
        if (rule.field === field.key) {
          if (rule.validator && !rule.validator(value, config)) {
            errors[field.key] = rule.message;
          }
        }
      }

      // Check format validation
      if (field.validation) {
        if (field.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors[field.key] = `${field.label} format is invalid`;
          }
        }

        if (field.validation.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
          errors[field.key] = `${field.label} must be at least ${field.validation.minLength} characters`;
        }

        if (field.validation.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
          errors[field.key] = `${field.label} must be at most ${field.validation.maxLength} characters`;
        }
      }
    }

    // Provider-specific validation
    if (provider === 'webflow') {
      // Webflow requires both API key and Collection ID
      if (!config.api_key && !config.accessToken) {
        errors['api_key'] = 'Webflow API key or OAuth token is required';
        missingFields.push('api_key');
      }
      
      if (!config.collection_id && !config.collectionId) {
        errors['collection_id'] = 'Collection ID is required for Webflow blog posting';
        missingFields.push('collection_id');
        warnings.push('Webflow blog posting requires a Collection ID to specify which CMS collection to publish to');
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      missingFields,
      warnings,
    };
  }

  /**
   * Get required configuration fields for a provider
   */
  static getRequiredFields(provider: IntegrationType): ConfigField[] {
    return this.getRequirements(provider).requiredFields;
  }

  /**
   * Get optional configuration fields for a provider
   */
  static getOptionalFields(provider: IntegrationType): ConfigField[] {
    return this.getRequirements(provider).optionalFields;
  }

  /**
   * Get publishing requirements for a provider
   */
  static getPublishingRequirements(provider: IntegrationType): PublishingRequirements {
    return this.getRequirements(provider).publishingRequirements;
  }

  /**
   * Get field mapping requirements for a provider
   */
  static getFieldMappingRequirements(provider: IntegrationType): FieldMappingRequirement[] {
    return this.getRequirements(provider).fieldMappingRequirements;
  }

  /**
   * Validate field mappings for a provider
   */
  static validateFieldMappings(
    provider: IntegrationType,
    mappings: FieldMapping[]
  ): ValidationResult {
    const requirements = this.getFieldMappingRequirements(provider);
    const errors: Record<string, string> = {};
    const requiredMappings = requirements.filter(r => r.required);

    for (const required of requiredMappings) {
      const mapping = mappings.find(m => m.blogField === required.blogField);
      if (!mapping) {
        errors[required.blogField] = `Field mapping for "${required.blogField}" is required`;
      } else if (!mapping.targetField) {
        errors[required.blogField] = `Target field for "${required.blogField}" must be specified`;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Get a human-readable summary of requirements
   */
  static getRequirementsSummary(provider: IntegrationType): string {
    const requirements = this.getRequirements(provider);
    const requiredFields = requirements.requiredFields.map(f => f.label).join(', ');
    
    return `${requirements.displayName} requires: ${requiredFields}. ${requirements.description}`;
  }

  /**
   * Check if a configuration is ready for publishing
   */
  static isReadyForPublishing(provider: IntegrationType, config: ConnectionConfig): boolean {
    const analysis = this.analyzeConfiguration(provider, config);
    return analysis.valid && analysis.missingFields.length === 0;
  }
}

export default IntegrationRequirementsAnalyzer;

