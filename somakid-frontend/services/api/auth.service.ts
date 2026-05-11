/**
 * SOMAKID AI - Authentication Service
 * Handles user login, registration, child authentication, and profile management.
 */

import { backendClient, storeAuthToken, clearAuthTokens } from './client';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ChildLoginRequest,
  UserProfile,
  ChildProfile,
  CreateChildRequest,
} from '../../types/api.types';

// =============================================================================
// Authentication Service
// =============================================================================

export const AuthService = {
  /**
   * Authenticate a parent user with email and password.
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await backendClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      request
    );

    const { user, token } = response.data.data;
    await storeAuthToken(token);

    return { user, token };
  },

  /**
   * Register a new parent account.
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await backendClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      {
        nom: request.lastName,
        prenom: request.firstName,
        email: request.email,
        password: request.password,
        confirmation_mot_de_passe: request.passwordConfirmation,
        langue: request.language || 'fr',
        pays: request.country || 'CD',
      }
    );

    const { user, token } = response.data.data;
    await storeAuthToken(token);

    return { user, token };
  },

  /**
   * Authenticate a child using their profile ID and PIN code.
   */
  async loginChild(request: ChildLoginRequest): Promise<{ child: ChildProfile; token: string }> {
    const response = await backendClient.post<ApiResponse<{ child: ChildProfile; token: string }>>(
      '/auth/login-child',
      {
        enfant_id: request.childId,
        pin: request.pin,
      }
    );

    const { child, token } = response.data.data;
    await storeAuthToken(token);

    return { child, token };
  },

  /**
   * Log out the current user by invalidating the token.
   */
  async logout(): Promise<void> {
    try {
      await backendClient.post('/auth/logout');
    } finally {
      await clearAuthTokens();
    }
  },

  /**
   * Get the currently authenticated user's profile.
   */
  async getProfile(): Promise<UserProfile> {
    const response = await backendClient.get<ApiResponse<UserProfile>>('/auth/me');
    return response.data.data;
  },

  /**
   * Update the current user's profile information.
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await backendClient.put<ApiResponse<UserProfile>>(
      '/auth/profile',
      data
    );
    return response.data.data;
  },

  /**
   * Change the user's password.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmation: string
  ): Promise<void> {
    await backendClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmation,
    });
  },
};

// =============================================================================
// Child Profile Service
// =============================================================================

export const ChildService = {
  /**
   * Create a new child profile under the authenticated parent.
   */
  async createChild(request: CreateChildRequest): Promise<ChildProfile> {
    const response = await backendClient.post<ApiResponse<ChildProfile>>(
      '/children',
      {
        prenom: request.firstName,
        age: request.age,
        avatar: request.avatar,
        code_pin: request.pinCode,
        langue: request.language,
      }
    );
    return response.data.data;
  },

  /**
   * Get all child profiles for the authenticated parent.
   */
  async getChildren(): Promise<ChildProfile[]> {
    const response = await backendClient.get<ApiResponse<ChildProfile[]>>('/children');
    return response.data.data;
  },

  /**
   * Get a specific child profile by ID.
   */
  async getChildById(childId: string): Promise<ChildProfile> {
    const response = await backendClient.get<ApiResponse<ChildProfile>>(
      `/children/${childId}`
    );
    return response.data.data;
  },

  /**
   * Update a child's profile information.
   */
  async updateChild(
    childId: string,
    data: Partial<CreateChildRequest>
  ): Promise<ChildProfile> {
    const response = await backendClient.put<ApiResponse<ChildProfile>>(
      `/children/${childId}`,
      {
        prenom: data.firstName,
        age: data.age,
        avatar: data.avatar,
        langue: data.language,
      }
    );
    return response.data.data;
  },

  /**
   * Delete a child profile.
   */
  async deleteChild(childId: string): Promise<void> {
    await backendClient.delete(`/children/${childId}`);
  },
};