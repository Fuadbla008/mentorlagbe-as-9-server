const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["student", "tutor", "admin"], default: "student" },
    phone: { type: String, default: "" },
    bio: { type: String, default: "" },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    bookmarks: [
      {
        tuitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Tuition", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: "users" },
);

userSchema.index({ role: 1 });
userSchema.index({ "bookmarks.tuitionId": 1 });

module.exports = mongoose.model("User", userSchema);
