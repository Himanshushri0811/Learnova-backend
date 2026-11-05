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
        trim: true,
    },
    guardianName: {
        type: String,
        trim: true,
    },
    guardianPhone: {
        type: String,
        trim: true,
    },
    guardianEmail: {
        type: String,
        trim: true,
        lowercase: true,
    },
    fatherName: {
        type: String,
        trim: true,
        maxlength: [100, "Father's name cannot exceed 100 characters"],
    },
    motherName: {
        type: String,
        trim: true,
        maxlength: [100, "Mother's name cannot exceed 100 characters"],
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    profilePhoto: {
        type: String,
        maxlength: [350000, 'Profile photo is too large'],
    },
    username: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
        minlength: [4, 'Username must be at least 4 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    passwordHash: {
        type: String,
        select: false,
    },
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
    toJSON: {
        transform: (_doc, ret) => {
            delete ret.passwordHash;
            delete ret.__v;
            return ret;
        },
    },
});
StudentSchema.index({ isArchived: 1, gradeLevel: 1 });
export const StudentModel = mongoose.model('Student', StudentSchema);
