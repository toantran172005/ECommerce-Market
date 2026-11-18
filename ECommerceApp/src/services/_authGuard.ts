import { auth } from '../firebaseConfig';
import { apiError } from './http';

export function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw apiError('AUTH_REQUIRED', 'Vui lòng đăng nhập để thực hiện tính năng này.');
  }
  return uid;
}

export function getUidOrNull(): string | null {
  return auth.currentUser?.uid ?? null;
}
