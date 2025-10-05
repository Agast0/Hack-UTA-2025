const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    picture: {
      type: String,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
