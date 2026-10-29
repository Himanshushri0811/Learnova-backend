import mongoose, { Schema } from 'mongoose';
const StudentSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    gradeLevel: {
        type: String,
        required: [true, 'Grade level is required'],
        trim: true,
    },
    guardianName: {
        type: String,
        required: [true, 'Guardian name is required'],
        trim: true,
    },
    guardianPhone: {
        type: String,
        required: [true, 'Guardian phone is required'],
        trim: true,
    },
    guardianEmail: {
        type: String,
        trim: true,
        lowercase: true,
    },
    // Soft-delete / archival pattern for academic history preservation
    isArchived: {
        type: Boolean,
        default: false,
        index: true,
    },
    archivedAt: {
        type: Date,
        default: null,
    },
    academicNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
}, {
    timestamps: true,
});
// Compound index for active student searches by grade
StudentSchema.index({ isArchived: 1, gradeLevel: 1 });
export const StudentModel = mongoose.model('Student', StudentSchema);
