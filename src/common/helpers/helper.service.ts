import process from 'node:process';

export class HelperService {
  /**
   * Check if the application is running in production mode
   */
  static isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get time in UTC
   */
  static getTimeInUtc(date: Date): Date {
    return new Date(date.toISOString());
  }
  
}
