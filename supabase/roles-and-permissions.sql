-- =====================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
-- =====================================================
-- This implements a comprehensive RBAC system with:
-- - System Admin: Full system control
-- - Super Admin: Multi-organization management
-- - Admin: Organization-level management
-- - Manager: User and content management
-- - Editor: Content creation and editing
-- - Writer: Basic content creation
-- =====================================================

-- =====================================================
-- CLEANUP: Drop all dependent policies first
-- =====================================================
-- This prevents "other objects depend on it" errors

-- Drop policies on organizations table
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update own organization details" ON organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view and update own organization" ON organizations;

-- Drop policies on users table
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Managers can update user roles" ON users;
DROP POLICY IF EXISTS "Managers can update users" ON users;

-- Drop policies on blog_posts table
DROP POLICY IF EXISTS "Users can view org blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Writers can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update blog posts based on role" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete blog posts based on role" ON blog_posts;

-- Drop policies on api_usage_logs table
DROP POLICY IF EXISTS "System admins can view all logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Admins can view org logs" ON api_usage_logs;

-- Drop existing enum if it exists and recreate with all roles
DO $$ BEGIN
    DROP TYPE IF EXISTS user_role CASCADE;
    CREATE TYPE user_role AS ENUM (
        'system_admin',     -- Full system access, all integrations, API, logs
        'super_admin',      -- Can create/manage multiple organizations
        'admin',            -- Organization owner, full org access
        'manager',          -- Manage users, content, and workflows
        'editor',           -- Create and edit content, moderate
        'writer'            -- Create and edit own content only
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- ROLES TABLE
-- Defines available roles and their capabilities
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name user_role UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Higher number = more permissions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert role definitions
INSERT INTO roles (name, display_name, description, level) VALUES
    ('system_admin', 'System Administrator', 'Full system control including integrations, API management, and usage logs', 100),
    ('super_admin', 'Super Administrator', 'Can create and manage multiple organizations', 90),
    ('admin', 'Administrator', 'Organization owner with full access to organization resources', 80),
    ('manager', 'Manager', 'Manage team members, content, and workflows within organization', 60),
    ('editor', 'Editor', 'Create, edit, and publish content with moderation capabilities', 40),
    ('writer', 'Writer', 'Create and edit own blog posts and content', 20)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    level = EXCLUDED.level;

-- =====================================================
-- PERMISSIONS TABLE
-- Granular permissions for different actions
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL, -- e.g., 'blog_posts', 'users', 'organizations'
    action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    -- System-level permissions
    ('system.integrations.manage', 'integrations', 'manage', 'Manage all system integrations'),
    ('system.api.manage', 'api', 'manage', 'Manage API keys and configurations'),
    ('system.logs.view', 'logs', 'read', 'View all system usage logs'),
    ('system.analytics.view', 'analytics', 'read', 'View system-wide analytics'),
    
    -- Organization permissions
    ('organization.create', 'organizations', 'create', 'Create new organizations'),
    ('organization.delete', 'organizations', 'delete', 'Delete organizations'),
    ('organization.update', 'organizations', 'update', 'Update organization settings'),
    ('organization.view', 'organizations', 'read', 'View organization details'),
    
    -- User management permissions
    ('users.create', 'users', 'create', 'Invite and create new users'),
    ('users.delete', 'users', 'delete', 'Remove users from organization'),
    ('users.update', 'users', 'update', 'Update user roles and permissions'),
    ('users.view', 'users', 'read', 'View user profiles'),
    
    -- Content permissions
    ('content.create', 'blog_posts', 'create', 'Create new blog posts'),
    ('content.delete', 'blog_posts', 'delete', 'Delete blog posts'),
    ('content.update', 'blog_posts', 'update', 'Edit blog posts'),
    ('content.publish', 'blog_posts', 'publish', 'Publish blog posts'),
    ('content.view', 'blog_posts', 'read', 'View blog posts'),
    ('content.moderate', 'blog_posts', 'moderate', 'Moderate and approve content'),
    
    -- Template permissions
    ('templates.create', 'content_templates', 'create', 'Create content templates'),
    ('templates.delete', 'content_templates', 'delete', 'Delete templates'),
    ('templates.update', 'content_templates', 'update', 'Edit templates'),
    ('templates.view', 'content_templates', 'read', 'View templates'),
    
    -- Workflow permissions
    ('workflows.manage', 'workflows', 'manage', 'Manage content workflows'),
    ('workflows.view', 'workflows', 'read', 'View workflows'),
    
    -- Media permissions
    ('media.upload', 'media_assets', 'create', 'Upload media files'),
    ('media.delete', 'media_assets', 'delete', 'Delete media files'),
    ('media.view', 'media_assets', 'read', 'View media library')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROLE_PERMISSIONS TABLE
-- Maps roles to their permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL REFERENCES roles(name),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- System Admin: All permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'system_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Super Admin: Organization and user management, all content
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions WHERE name IN (
    'organization.create', 'organization.delete', 'organization.update', 'organization.view',
    'users.create', 'users.delete', 'users.update', 'users.view',
    'content.create', 'content.delete', 'content.update', 'content.publish', 'content.view', 'content.moderate',
    'templates.create', 'templates.delete', 'templates.update', 'templates.view',
    'workflows.manage', 'workflows.view',
    'media.upload', 'media.delete', 'media.view'
)
ON CONFLICT DO NOTHING;

-- Admin: Full organization access (no org creation/deletion)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE name IN (
    'organization.update', 'organization.view',
    'users.create', 'users.delete', 'users.update', 'users.view',
    'content.create', 'content.delete', 'content.update', 'content.publish', 'content.view', 'content.moderate',
    'templates.create', 'templates.delete', 'templates.update', 'templates.view',
    'workflows.manage', 'workflows.view',
    'media.upload', 'media.delete', 'media.view'
)
ON CONFLICT DO NOTHING;

-- Manager: User and content management
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE name IN (
    'organization.view',
    'users.create', 'users.update', 'users.view',
    'content.create', 'content.delete', 'content.update', 'content.publish', 'content.view', 'content.moderate',
    'templates.create', 'templates.update', 'templates.view',
    'workflows.manage', 'workflows.view',
    'media.upload', 'media.delete', 'media.view'
)
ON CONFLICT DO NOTHING;

-- Editor: Content creation and moderation
INSERT INTO role_permissions (role, permission_id)
SELECT 'editor', id FROM permissions WHERE name IN (
    'organization.view',
    'users.view',
    'content.create', 'content.update', 'content.publish', 'content.view', 'content.moderate',
    'templates.create', 'templates.update', 'templates.view',
    'workflows.view',
    'media.upload', 'media.view'
)
ON CONFLICT DO NOTHING;

-- Writer: Basic content creation
INSERT INTO role_permissions (role, permission_id)
SELECT 'writer', id FROM permissions WHERE name IN (
    'organization.view',
    'users.view',
    'content.create', 'content.update', 'content.view',
    'templates.view',
    'workflows.view',
    'media.upload', 'media.view'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- UPDATE USERS TABLE
-- Add role column and update existing users
-- =====================================================

-- First, drop any policies that depend on the role column
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update own organization details" ON organizations;

-- Now safely drop and recreate the role column
DO $$ 
BEGIN
    -- Drop the column if it exists (with CASCADE to handle dependencies)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users DROP COLUMN role CASCADE;
    END IF;
    
    -- Add the role column with the new enum type
    ALTER TABLE users ADD COLUMN role user_role DEFAULT 'writer';
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(organization_id, role);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN role_permissions rp ON rp.role = u.role
        JOIN permissions p ON p.id = rp.permission_id
        WHERE u.user_id = p_user_id
        AND p.name = p_permission_name
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$;

-- Function to check if user's role level is sufficient
CREATE OR REPLACE FUNCTION user_role_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT r.level INTO v_level
    FROM users u
    JOIN roles r ON r.name = u.role
    WHERE u.user_id = p_user_id;
    
    RETURN COALESCE(v_level, 0);
END;
$$;

-- Function to get user's permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.name, p.resource, p.action
    FROM users u
    JOIN role_permissions rp ON rp.role = u.role
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.user_id = p_user_id;
END;
$$;

-- =====================================================
-- AUDIT LOG TABLE
-- Track role changes and permission usage
-- =====================================================
CREATE TABLE IF NOT EXISTS role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    changed_by UUID REFERENCES users(user_id),
    old_role user_role,
    new_role user_role,
    organization_id UUID REFERENCES organizations(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO role_audit_log (user_id, old_role, new_role, organization_id)
        VALUES (NEW.user_id, OLD.role, NEW.role, NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS trigger_log_role_change ON users;
CREATE TRIGGER trigger_log_role_change
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION log_role_change();

-- =====================================================
-- RLS POLICIES FOR ROLES AND PERMISSIONS
-- =====================================================

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

-- Roles table policies
CREATE POLICY "Everyone can view roles"
    ON roles FOR SELECT
    USING (true);

-- Permissions table policies
CREATE POLICY "Everyone can view permissions"
    ON permissions FOR SELECT
    USING (true);

-- Role permissions table policies
CREATE POLICY "Everyone can view role permissions"
    ON role_permissions FOR SELECT
    USING (true);

-- Audit log policies
CREATE POLICY "Users can view their own role history"
    ON role_audit_log FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System admins can view all audit logs"
    ON role_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE user_id = auth.uid()
            AND role = 'system_admin'
        )
    );

-- =====================================================
-- UPDATE EXISTING RLS POLICIES WITH ROLE-BASED ACCESS
-- =====================================================

-- Drop and recreate blog_posts policies with role-based access
DROP POLICY IF EXISTS "Users can view org blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete own blog posts" ON blog_posts;

-- View blog posts: All users in the organization
CREATE POLICY "Users can view org blog posts"
    ON blog_posts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.user_id = auth.uid()
            AND users.organization_id = blog_posts.organization_id
        )
    );

-- Create blog posts: Writers and above
CREATE POLICY "Writers can create blog posts"
    ON blog_posts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = blog_posts.organization_id
            AND r.level >= 20 -- Writer level and above
        )
        AND author_id = auth.uid()
    );

-- Update blog posts: Own posts for writers, all posts for managers+
CREATE POLICY "Users can update blog posts based on role"
    ON blog_posts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = blog_posts.organization_id
            AND (
                (r.level >= 60 AND blog_posts.organization_id = u.organization_id) -- Managers can edit all
                OR (blog_posts.author_id = auth.uid()) -- Writers can edit own
            )
        )
    );

-- Delete blog posts: Own posts for writers, all posts for managers+
CREATE POLICY "Users can delete blog posts based on role"
    ON blog_posts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = blog_posts.organization_id
            AND (
                (r.level >= 60 AND blog_posts.organization_id = u.organization_id) -- Managers can delete all
                OR (blog_posts.author_id = auth.uid()) -- Writers can delete own
            )
        )
    );

-- =====================================================
-- USERS TABLE RLS POLICIES WITH ROLES
-- =====================================================
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Managers can update user roles" ON users;

-- View users: All org members can view each other
CREATE POLICY "Users can view org members"
    ON users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE user_id = auth.uid()
        )
    );

-- Update users: Managers and above can update roles
CREATE POLICY "Managers can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = users.organization_id
            AND r.level >= 60 -- Manager level and above
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = users.organization_id
            AND r.level >= 60
        )
    );

-- =====================================================
-- API USAGE LOGS RLS (System Admin only)
-- =====================================================
DROP POLICY IF EXISTS "System admins can view all logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Admins can view org logs" ON api_usage_logs;

CREATE POLICY "System admins can view all logs"
    ON api_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE user_id = auth.uid()
            AND role = 'system_admin'
        )
    );

CREATE POLICY "Admins can view org logs"
    ON api_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = api_usage_logs.organization_id
            AND r.level >= 80 -- Admin level and above
        )
    );

-- =====================================================
-- ORGANIZATIONS RLS WITH SUPER ADMIN
-- =====================================================
DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update own organization" ON organizations;

CREATE POLICY "Super admins can manage all organizations"
    ON organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE user_id = auth.uid()
            AND role IN ('system_admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can view and update own organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update own organization details"
    ON organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.name = u.role
            WHERE u.user_id = auth.uid()
            AND u.organization_id = organizations.id
            AND r.level >= 80 -- Admin level
        )
    );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON role_audit_log TO authenticated;

-- =====================================================
-- DOCUMENTATION
-- =====================================================
COMMENT ON TABLE roles IS 'Role definitions with hierarchy levels';
COMMENT ON TABLE permissions IS 'Granular permissions for different actions and resources';
COMMENT ON TABLE role_permissions IS 'Maps roles to their permissions';
COMMENT ON TABLE role_audit_log IS 'Audit trail for role changes';

COMMENT ON COLUMN roles.level IS 'Permission level: Higher = more permissions (System Admin=100, Writer=20)';
COMMENT ON COLUMN users.role IS 'User role: system_admin, super_admin, admin, manager, editor, writer';

