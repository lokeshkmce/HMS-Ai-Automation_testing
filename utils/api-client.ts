import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { environment } from '../config/environment';
import { logger } from './logger';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: unknown;
  failOnStatusCode?: boolean;
}

export class ApiClient {
  private context: APIRequestContext | null = null;
  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseURL?: string, token?: string) {
    this.baseURL = baseURL || environment.apiBaseURL;
    this.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (token || environment.apiToken) {
      this.defaultHeaders['Authorization'] = `Bearer ${token || environment.apiToken}`;
    }
  }

  async init(): Promise<ApiClient> {
    this.context = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: this.defaultHeaders,
    });
    return this;
  }

  private getContext(): APIRequestContext {
    if (!this.context) {
      throw new Error('ApiClient not initialized. Call init() first.');
    }
    return this.context;
  }

  async get(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    logger.info(`GET ${endpoint}`);
    const response = await this.getContext().get(endpoint, {
      headers: options?.headers,
      params: options?.params,
      failOnStatusCode: options?.failOnStatusCode ?? false,
    });
    logger.info(`GET ${endpoint} → ${response.status()}`);
    return response;
  }

  async post(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    logger.info(`POST ${endpoint}`);
    const response = await this.getContext().post(endpoint, {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
      failOnStatusCode: options?.failOnStatusCode ?? false,
    });
    logger.info(`POST ${endpoint} → ${response.status()}`);
    return response;
  }

  async put(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    logger.info(`PUT ${endpoint}`);
    const response = await this.getContext().put(endpoint, {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
      failOnStatusCode: options?.failOnStatusCode ?? false,
    });
    logger.info(`PUT ${endpoint} → ${response.status()}`);
    return response;
  }

  async delete(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    logger.info(`DELETE ${endpoint}`);
    const response = await this.getContext().delete(endpoint, {
      headers: options?.headers,
      params: options?.params,
      failOnStatusCode: options?.failOnStatusCode ?? false,
    });
    logger.info(`DELETE ${endpoint} → ${response.status()}`);
    return response;
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }
}
