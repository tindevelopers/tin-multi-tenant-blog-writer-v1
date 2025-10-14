"use client";

interface CloudRunHealthStatus {
  isHealthy: boolean;
  isWakingUp: boolean;
  lastChecked: Date;
  attempts: number;
  error?: string;
}

class CloudRunHealthManager {
  private baseURL: string;
  private maxWakeupAttempts: number = 2;
  private wakeupDelay: number = 1000; // 1 second between attempts
  private healthCheckDelay: number = 2000; // 2 seconds after wakeup

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Wake up the Cloud Run instance and wait for it to be healthy
   */
  async wakeUpAndWait(): Promise<CloudRunHealthStatus> {
    console.log('🌅 Starting Cloud Run wake-up process...');
    
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this.maxWakeupAttempts) {
      attempts++;
      console.log(`🔄 Wake-up attempt ${attempts}/${this.maxWakeupAttempts}`);

      try {
        // Try to wake up the instance with a simple request
        const response = await fetch(`${this.baseURL}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const healthData = await response.json();
          console.log('✅ Cloud Run is awake and healthy:', healthData);
          
          // Wait a bit more to ensure it's fully ready
          console.log(`⏳ Waiting ${this.healthCheckDelay/1000} seconds for full readiness...`);
          await new Promise(resolve => setTimeout(resolve, this.healthCheckDelay));
          
          // Final health check
          const finalHealth = await this.checkHealth();
          if (finalHealth.isHealthy) {
            return {
              isHealthy: true,
              isWakingUp: false,
              lastChecked: new Date(),
              attempts,
            };
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        console.warn(`⚠️ Wake-up attempt ${attempts} failed:`, errorMessage);
        
        if (attempts < this.maxWakeupAttempts) {
          console.log(`⏳ Waiting ${this.wakeupDelay/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.wakeupDelay));
        }
      }
    }

    return {
      isHealthy: false,
      isWakingUp: false,
      lastChecked: new Date(),
      attempts,
      error: lastError || 'Failed to wake up Cloud Run instance',
    };
  }

  /**
   * Check if the Cloud Run instance is healthy
   */
  async checkHealth(): Promise<CloudRunHealthStatus> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      if (response.ok) {
        return {
          isHealthy: true,
          isWakingUp: false,
          lastChecked: new Date(),
          attempts: 0,
        };
      } else {
        return {
          isHealthy: false,
          isWakingUp: false,
          lastChecked: new Date(),
          attempts: 0,
          error: `Health check failed with status ${response.status}`,
        };
      }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          isHealthy: false,
          isWakingUp: false,
          lastChecked: new Date(),
          attempts: 0,
          error: errorMessage,
        };
      }
  }

  /**
   * Get detailed health information including version and uptime
   */
  async getDetailedHealth(): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get detailed health:', error);
      return null;
    }
  }

  /**
   * Test a simple endpoint to ensure the instance is fully operational
   */
  async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error(`Test endpoint ${endpoint} failed:`, error);
      return false;
    }
  }
}

// Create singleton instance
const cloudRunHealth = new CloudRunHealthManager(
  process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app'
);

export default cloudRunHealth;
export { CloudRunHealthManager, type CloudRunHealthStatus };
