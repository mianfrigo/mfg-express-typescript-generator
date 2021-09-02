import { model, Schema } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const UserSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

UserSchema.plugin(uniqueValidator);

const UserModel = model('User', UserSchema);

export default UserModel;
