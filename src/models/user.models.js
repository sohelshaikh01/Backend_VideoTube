import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // for searching enable in field optimise
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String,
        }, 
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video" 
            }   
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        
        refreshToken: {
            type: String,
        }
    }, { timestamps: true }
);

// If any change in data reruns function and change the password.
// Check the condition
userSchema.pre("save", async function(next) {
    // check is password modified or not
    if(!this.isModified("password")) return next(); // this.password in string may problem
        // On What to do and how many rounds
        this.password = await bcrypt.hash(this.password, 10);
        next();
});
// don't use arrow function, it doesn't have `this` reference, 
// here is must to know the context


// Create method to decode password
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
    // result in true or false
    // match and compare password
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
}

export const User = mongoose.model("User", userSchema);