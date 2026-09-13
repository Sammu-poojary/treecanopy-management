const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['Tree Cutter', 'Official', 'Admin', 'Citizen'],
      required: true,
    },
    receiverId: {
      type: String,
      default: 'all',
    },
    receiverName: {
      type: String,
      default: 'All Staff',
    },
    receiverRole: {
      type: String,
      enum: ['Tree Cutter', 'Official', 'Admin', 'Citizen', 'All'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Context Category attachment
    contextType: {
      type: String, // 'task' | 'leave' | 'property' | 'location' | null
      default: null,
    },
    relatedTaskId: {
      type: String,
      default: null,
    },
    relatedTaskTitle: {
      type: String,
      default: null,
    },
    relatedTaskLocation: {
      type: String,
      default: null,
    },
    // GPS Location details
    locationLat: {
      type: Number,
      default: null,
    },
    locationLng: {
      type: Number,
      default: null,
    },
    locationAddress: {
      type: String,
      default: null,
    },
    attachments: [
      {
        type: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
