const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, lowercase: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ["student", "tutor", "admin"], required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    transactionId: { type: String, required: true },
    stripeSessionId: { type: String, default: "", index: true, sparse: true },
    paymentStatus: { type: String, enum: ["paid"], default: "paid" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "payments" },
);

module.exports = mongoose.model("Payment", paymentSchema);
