const crypto = require('crypto');

// Function to generate idempotency key (same as in Note model)
function generateIdempotencyKey(noteId, releaseAt) {
  return crypto.createHash('sha256')
    .update(`${noteId}:${releaseAt.toISOString()}`)
    .digest('hex');
}

describe('Idempotency Key Generation', () => {
  test('should generate consistent keys for same inputs', () => {
    const noteId = '507f1f77bcf86cd799439011';
    const releaseAt = new Date('2024-01-01T12:00:00.000Z');
    
    const key1 = generateIdempotencyKey(noteId, releaseAt);
    const key2 = generateIdempotencyKey(noteId, releaseAt);
    
    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64); // SHA-256 hex string length
  });

  test('should generate different keys for different note IDs', () => {
    const releaseAt = new Date('2024-01-01T12:00:00.000Z');
    const noteId1 = '507f1f77bcf86cd799439011';
    const noteId2 = '507f1f77bcf86cd799439012';
    
    const key1 = generateIdempotencyKey(noteId1, releaseAt);
    const key2 = generateIdempotencyKey(noteId2, releaseAt);
    
    expect(key1).not.toBe(key2);
  });

  test('should generate different keys for different release times', () => {
    const noteId = '507f1f77bcf86cd799439011';
    const releaseAt1 = new Date('2024-01-01T12:00:00.000Z');
    const releaseAt2 = new Date('2024-01-01T12:00:01.000Z');
    
    const key1 = generateIdempotencyKey(noteId, releaseAt1);
    const key2 = generateIdempotencyKey(noteId, releaseAt2);
    
    expect(key1).not.toBe(key2);
  });

  test('should handle edge cases', () => {
    const noteId = '507f1f77bcf86cd799439011';
    const releaseAt = new Date('2024-01-01T12:00:00.000Z');
    
    // Should work with empty string noteId
    const key1 = generateIdempotencyKey('', releaseAt);
    expect(key1).toHaveLength(64);
    
    // Should work with null noteId
    const key2 = generateIdempotencyKey(null, releaseAt);
    expect(key2).toHaveLength(64);
  });
});
