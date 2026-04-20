/**
 * Validation utilities for inputs
 */

import { config } from './config';

export function validatePGN(pgn: unknown): string {
  // Type check
  if (typeof pgn !== 'string') {
    throw new Error('PGN must be a string');
  }

  // Size check
  if (pgn.length > config.api.maxPGNSize) {
    throw new Error(`PGN size exceeds maximum allowed size of ${config.api.maxPGNSize} bytes`);
  }

  // Empty check
  const trimmedPgn = pgn.trim();
  if (!trimmedPgn) {
    throw new Error('PGN cannot be empty');
  }

  // Basic PGN format check (should have at least one bracket)
  if (!trimmedPgn.includes('[') || !trimmedPgn.includes(']')) {
    throw new Error('Invalid PGN format: missing tags');
  }

  return trimmedPgn;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < config.password.minLength) {
    errors.push(`Password must be at least ${config.password.minLength} characters`);
  }

  if (config.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.password.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeUsername(username: string): string {
  // Remove leading/trailing whitespace and limit special characters
  return username.trim().replace(/[^\w\-_]/g, '');
}
