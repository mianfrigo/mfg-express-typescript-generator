import { model, Schema } from 'mongoose';
//{{roles}} import { ROLES } from '../config/roles';

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
//{{roles}}     role: { type: String, enum: ROLES, default: 'user' },
  },
  { timestamps: true }
);

export default model('User', UserSchema);
