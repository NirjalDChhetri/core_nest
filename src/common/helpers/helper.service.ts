import process from 'node:process';

export class HelperService {
  /**
   * Check if the application is running in production mode
   */
  static isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if the application is running in development mode
   */
  static isDev(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if the application is running in test mode
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Get time in UTC
   */
  static getTimeInUtc(date: Date): Date {
    return new Date(date.toISOString());
  }
}
