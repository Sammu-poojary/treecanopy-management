const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Who should receive this notification
    targetUserId: {
      type: String,
      default: null, // null means broadcast to role
    },
    targetRole: {
      type: String,
      enum: ['Citizen', 'Official', 'Tree Cutter', 'Admin', null],
      default: null,
    },
    type: {
      type: String,
      enum: [
        'complaint_submitted',
        'task_assigned',
        'status_updated',
        'work_completed',
        'waste_disposed',
        'complaint_closed',
        'maintenance_created',
        'attendance_marked',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: String,
      default: null, // complaintId or taskId
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
