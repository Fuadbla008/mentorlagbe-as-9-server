const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    tuitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Tuition", required: true },
    tuitionTitle: { type: String, required: true },
    subject: { type: String, required: true },
    monthlyFee: { type: Number, required: true },
    tutorEmail: { type: String, required: true, lowercase: true, index: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true, lowercase: true, index: true },
    studentPhone: { type: String, default: "" },
    preferredSchedule: { type: String, default: "" },
    studentNote: { type: String, default: "", maxlength: 1000 },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "applications" },
);

applicationSchema.index({ tuitionId: 1, studentEmail: 1 }, { unique: true });
applicationSchema.index({ tutorEmail: 1, status: 1 });

module.exports = mongoose.model("Application", applicationSchema);
