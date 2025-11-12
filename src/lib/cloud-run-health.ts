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
   * Note: CORS readiness is tested by actual API calls in keyword-research.ts retry logic
   */
  async wakeUpAndWait(): Promise<CloudRunHealthStatus> {
    console.log('🌅 Starting Cloud Run wake-up process...');
    
    let attempts = 0;
    let lastError: string | undefined;
    const maxAttempts = 10; // More attempts for cold starts
    const baseDelay = 2000; // Start with 2 seconds

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Wake-up attempt ${attempts}/${maxAttempts}`);

      try {
        // Check health via API route (avoids CORS)
        const healthResponse = await fetch('/api/cloud-run/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });

        const healthData = await healthResponse.json();

        if (healthData.isHealthy) {
          console.log('✅ Cloud Run health check passed - service is ready');
          return {
            isHealthy: true,
            isWakingUp: false,
            lastChecked: new Date(),
            attempts,
          };
        } else if (healthData.isWakingUp) {
          lastError = healthData.error || 'Cloud Run is starting up...';
          console.log(`⏳ Cloud Run is starting up...`);
        } else {
          lastError = healthData.error || 'Cloud Run is not available';
        }

        // Calculate exponential backoff delay
        const delay = Math.min(baseDelay * Math.pow(1.5, attempts - 1), 10000); // Max 10 seconds
        console.log(`⏳ Waiting ${Math.round(delay/1000)} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        console.warn(`⚠️ Wake-up attempt ${attempts} failed:`, errorMessage);
        
        if (attempts < maxAttempts) {
          const delay = Math.min(baseDelay * Math.pow(1.5, attempts - 1), 10000);
          console.log(`⏳ Waiting ${Math.round(delay/1000)} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If we've exhausted attempts, still mark as waking up if it was a startup issue
    const isStillWakingUp = lastError?.includes('starting up') || lastError?.includes('CORS');
    
    return {
      isHealthy: false,
      isWakingUp: isStillWakingUp,
      lastChecked: new Date(),
      attempts,
      error: lastError || 'Failed to wake up Cloud Run instance',
    };
  }

  /**
   * Check if the Cloud Run instance is healthy
   * Uses API route to avoid CORS issues
   */
  async checkHealth(): Promise<CloudRunHealthStatus> {
    try {
      const response = await fetch('/api/cloud-run/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      const data = await response.json();

      return {
        isHealthy: data.isHealthy === true,
        isWakingUp: data.isWakingUp === true,
        lastChecked: new Date(),
        attempts: 0,
        error: data.error || undefined,
      };
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
