import test from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthErrorCode, googleAuthErrorMessage } from '../js/core/auth-errors.js';

test('Google auth diagnostics distinguish blocked, closed, storage and network failures', () => {
  for (const [code, expected] of [
    ['auth/popup-blocked', /fenêtre Google a été bloquée/],
    ['auth/popup-closed-by-user', /fermée avant la fin/],
    ['auth/cancelled-popup-request', /autre tentative/],
    ['auth/web-storage-unsupported', /stockage nécessaire/],
    ['auth/network-request-failed', /requête de connexion/],
    ['auth/unauthorized-domain', /domaine n’est pas autorisé/],
    ['auth/operation-not-supported-in-this-environment', /onglet normal/],
    ['auth/internal-error', /initialisation/],
    ['auth/not-initialized', /pas encore disponible/]
  ]) {
    const message = googleAuthErrorMessage({ code });
    assert.match(message, expected);
    assert.ok(message.endsWith(`Code : ${code}`));
  }
});

test('Google auth diagnostics never expose Firebase payloads or unsafe code strings', () => {
  const privatePayload = { message: 'private-email@example.test private-token', customData: { email: 'private-email@example.test', credential: 'private-token' } };
  for (const code of ['auth/popup-blocked', 'auth/new-safe-code', undefined, null, 17, 'private-email@example.test', 'auth/bad\nprivate-token', 'auth/' + 'a'.repeat(65)]) {
    const error = { ...privatePayload, code };
    const message = googleAuthErrorMessage(error);
    assert.ok(!message.includes('private-email') && !message.includes('private-token'));
    assert.match(googleAuthErrorCode(error), /^auth\/[a-z0-9-]+$/);
  }
  assert.equal(googleAuthErrorCode(null), 'auth/unknown');
  assert.match(googleAuthErrorMessage(null, { online: false }), /hors ligne/);
});
