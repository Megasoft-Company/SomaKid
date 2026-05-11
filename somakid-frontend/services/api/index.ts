/**
 * SOMAKID AI - Services Index
 * Barrel export for all API services.
 */

export { AuthService, ChildService } from './auth.service';
export { VisionService } from './vision.service';
export { QuizService } from './quiz.service';
export { ChatService } from './chat.service';
export { ProgressionService } from './progression.service';

export {
  backendClient,
  aiEngineClient,
  storeAuthToken,
  getAuthToken,
  clearAuthTokens,
  isAuthenticated,
  extractErrorMessage,
} from './client';