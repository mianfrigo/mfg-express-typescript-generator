import { model, Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
  },
  { timestamps: true }
);

export default model('User', UserSchema);
