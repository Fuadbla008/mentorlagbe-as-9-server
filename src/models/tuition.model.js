const mongoose = require("mongoose");

const tuitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true },
    classLevel: { type: String, required: true, trim: true },
    mode: { type: String, enum: ["Online", "Offline"], required: true },
    location: { type: String, default: "" },
    monthlyFee: { type: Number, required: true, min: 0 },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    bannerImage: { type: String, default: "" },
    description: { type: String, required: true, maxlength: 3000 },
    tutorName: { type: String, required: true },
    tutorEmail: { type: String, required: true, lowercase: true, index: true },
    tutorImage: { type: String, default: "" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "tuitions" },
);

tuitionSchema.index({ approvalStatus: 1, isActive: 1, createdAt: -1 });
tuitionSchema.index({ subject: 1, classLevel: 1, mode: 1 });
tuitionSchema.index({ title: "text", subject: "text", description: "text" });

module.exports = mongoose.model("Tuition", tuitionSchema);
