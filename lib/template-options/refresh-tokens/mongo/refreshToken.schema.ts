import { model, Schema } from 'mongoose';

const RefreshTokenSchema = new Schema({
  // SHA-256 of the token: a database leak does not leak usable tokens
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  // every token rotated from one login shares a family
  familyId: { type: String, required: true, index: true },
  // MongoDB removes the document once this date has passed
  expiresAt: { type: Date, required: true, expires: 0 },
  revokedAt: { type: Date },
});

export default model('RefreshToken', RefreshTokenSchema);
