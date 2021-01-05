import { model, Schema } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const UserSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    requiered: true,
  },
  email: {
    type: String,
    requiered: true,
    unique: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.plugin(uniqueValidator);

const UserModel = model('User', UserSchema);

export default UserModel;
