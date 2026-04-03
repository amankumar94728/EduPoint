// sendOtp , signup , login ,  changePassword
const User = require('./../models/user');
const Profile = require('./../models/profile');
const Course = require('./../models/course');
const CourseProgress = require('./../models/courseProgress');
const optGenerator = require('otp-generator');
const OTP = require('../models/OTP')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookie = require('cookie');
const mailSender = require('../utils/mailSender');
const otpTemplate = require('../mail/templates/emailVerificationTemplate');
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const admin = require('../config/firebase');

// ================ SEND-OTP For Email Verification ================
exports.sendOTP = async (req, res) => {
    try {

        // fetch email from re.body 
        const { email } = req.body;

        // check user already exist ?
        const checkUserPresent = await User.findOne({ email });

        // if exist then response
        if (checkUserPresent) {
            console.log('(when otp generate) User alreay registered')
            return res.status(401).json({
                success: false,
                message: 'User is Already Registered'
            })
        }

        // generate Otp
        const otp = optGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        })
        // console.log('Your otp - ', otp);

        const name = email.split('@')[0].split('.').map(part => part.replace(/\d+/g, '')).join(' ');
        console.log(name);

        // send otp in mail
        await mailSender(email, 'OTP Verification Email', otpTemplate(otp, name));

        // create an entry for otp in DB
        const otpBody = await OTP.create({ email, otp });
        // console.log('otpBody - ', otpBody);



        // return response successfully
        res.status(200).json({
            success: true,
            otp,
            message: 'Otp sent successfully'
        });
    }

    catch (error) {
        console.log('Error while generating Otp - ', error);
        res.status(200).json({
            success: false,
            message: 'Error while generating Otp',
            error: error.mesage
        });
    }
}


// ================ SIGNUP ================
exports.signup = async (req, res) => {
    try {
        // extract data 
        const { firstName, lastName, email, password, confirmPassword,
            accountType, contactNumber, otp } = req.body;

        // const { firstName, lastName, email, password, confirmPassword,
        //     accountType, contactNumber} = req.body;

        // validation
        if (!firstName || !lastName || !email || !password || !confirmPassword || !accountType || !otp) {
            return res.status(401).json({
                success: false,
                message: 'All fields are required..!'
            });
        }

        // check both pass matches or not
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                messgae: 'passowrd & confirm password does not match, Please try again..!'
            });
        }

        // check user have registered already
        const checkUserAlreadyExits = await User.findOne({ email });

        // if yes ,then say to login
        if (checkUserAlreadyExits) {
            return res.status(400).json({
                success: false,
                message: 'User registered already, go to Login Page'
            });
        }

        // find most recent otp stored for user in DB
        const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 }).limit(1);


        
        // console.log('recentOtp ', recentOtp)

        // .sort({ createdAt: -1 }): 
        // It's used to sort the results based on the createdAt field in descending order (-1 means descending). 
        // This way, the most recently created OTP will be returned first.

        // .limit(1): It limits the number of documents returned to 1. 


        // if otp not found
        if (!recentOtp || recentOtp.length == 0) {
            return res.status(400).json({
                success: false,
                message: 'Otp not found in DB, please try again'
            });
        } else if (otp !== recentOtp.otp) {
            // otp invalid
            return res.status(400).json({
                success: false,
                message: 'Invalid Otp'
            })
        }

        // hash - secure passoword
        let hashedPassword = await bcrypt.hash(password, 10);

        // additionDetails
        const profileDetails = await Profile.create({
            gender: null, dateOfBirth: null, about: null, contactNumber: null
        });

        let approved = "";
        approved === "Instructor" ? (approved = false) : (approved = true);

        // create entry in DB
        const userData = await User.create({
            firstName, lastName, email, password: hashedPassword, contactNumber,
            accountType: accountType, additionalDetails: profileDetails._id,
            approved: approved,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        });

        // return success message
        res.status(200).json({
            success: true,
            message: 'User Registered Successfully'
        });
    }

    catch (error) {
        console.log('Error while registering user (signup)');
        console.log(error)
        res.status(401).json({
            success: false,
            error: error.message,
            messgae: 'User cannot be registered , Please try again..!'
        })
    }
}


// ================ LOGIN ================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // check user is registered and saved data in DB
        let user = await User.findOne({ email }).populate('additionalDetails');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'You are not registered with us'
            });
        }


        // comapare given password and saved password from DB
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType // This will help to check whether user have access to route, while authorzation
            };

            // Generate token 
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "24h",
            });

            user = user.toObject();
            user.token = token;
            user.password = undefined; // we have remove password from object, not DB


            // cookie
            const cookieOptions = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                httpOnly: true
            }

            res.cookie('token', token, cookieOptions).status(200).json({
                success: true,
                user,
                token,
                message: 'User logged in successfully'
            });
        }
        // password not match
        else {
            return res.status(401).json({
                success: false,
                message: 'Password not matched'
            });
        }
    }

    catch (error) {
        console.log('Error while Login user');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            messgae: 'Error while Login user'
        })
    }
}


// ================ CHANGE PASSWORD ================
exports.changePassword = async (req, res) => {
    try {
        // extract data
        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        // validation
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(403).json({
                success: false,
                message: 'All fileds are required'
            });
        }

        // get user
        const userDetails = await User.findById(req.user.id);

        // validate old passowrd entered correct or not
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        )

        // if old password not match 
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false, message: "Old password is Incorrect"
            });
        }

        // check both passwords are matched
        if (newPassword !== confirmNewPassword) {
            return res.status(403).json({
                success: false,
                message: 'The password and confirm password do not match'
            })
        }


        // hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // update in DB
        const updatedUserDetails = await User.findByIdAndUpdate(req.user.id,
            { password: hashedPassword },
            { new: true });


        // send email
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                'Password for your account has been updated',
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )
            );
            // console.log("Email sent successfully:", emailResponse);
        }
        catch (error) {
            console.error("Error occurred while sending email:", error);
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            });
        }


        // return success response
        res.status(200).json({
            success: true,
            mesage: 'Password changed successfully'
        });
    }

    catch (error) {
        console.log('Error while changing passowrd');
        console.log(error)
        res.status(500).json({
            success: false,
            error: error.message,
            messgae: 'Error while changing passowrd'
        })
    }
}

// ================ DEMO LOGIN ================
exports.demoLogin = async (req, res) => {
    try {
        const demoEmail = process.env.DEMO_EMAIL || 'demo@edupoint.com';
        const demoPassword = process.env.DEMO_PASSWORD || 'Demo@12345';

        // find or create the demo user
        let demoUser = await User.findOne({ email: demoEmail }).populate('additionalDetails');

        if (!demoUser) {
            // create profile
            const profileDetails = await Profile.create({
                gender: null, dateOfBirth: null, about: 'Demo student account with access to all courses.', contactNumber: null
            });

            const hashedPassword = await bcrypt.hash(demoPassword, 10);

            demoUser = await User.create({
                firstName: 'Demo',
                lastName: 'Student',
                email: demoEmail,
                password: hashedPassword,
                accountType: 'Student',
                approved: true,
                active: true,
                additionalDetails: profileDetails._id,
                image: `https://api.dicebear.com/5.x/initials/svg?seed=Demo Student`,
            });

            demoUser = await User.findById(demoUser._id).populate('additionalDetails');
        }

        // enroll demo user in all published courses they aren't already enrolled in
        const publishedCourses = await Course.find({ status: 'Published' }).select('_id studentsEnrolled');

        for (const course of publishedCourses) {
            if (!course.studentsEnrolled.includes(demoUser._id)) {
                // add student to course
                await Course.findByIdAndUpdate(course._id, {
                    $push: { studentsEnrolled: demoUser._id }
                });

                // create course progress entry
                const courseProgress = await CourseProgress.create({
                    courseID: course._id,
                    userId: demoUser._id,
                    completedVideos: [],
                });

                // add course + progress to user
                await User.findByIdAndUpdate(demoUser._id, {
                    $push: {
                        courses: course._id,
                        courseProgress: courseProgress._id,
                    },
                });
            }
        }

        // re-fetch updated user
        demoUser = await User.findById(demoUser._id).populate('additionalDetails');

        // generate JWT
        const payload = {
            email: demoUser.email,
            id: demoUser._id,
            accountType: demoUser.accountType,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        let userObj = demoUser.toObject();
        userObj.token = token;
        userObj.password = undefined;

        const cookieOptions = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        return res.cookie('token', token, cookieOptions).status(200).json({
            success: true,
            user: userObj,
            token,
            message: 'Demo login successful',
        });
    } catch (error) {
        console.error('Error during demo login:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Demo login failed',
        });
    }
};


// ================ FIREBASE LOGIN (Google + Email) ================
exports.firebaseLogin = async (req, res) => {
    try {
        const { idToken, firstName, lastName, accountType } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);

        const { email, name, picture, uid } = decodedToken;

        // Find existing user or create new one
        let user = await User.findOne({ email }).populate('additionalDetails');

        if (!user) {
            // Extract name parts
            const nameParts = (name || '').split(' ');
            const fName = firstName || nameParts[0] || 'User';
            const lName = lastName || nameParts.slice(1).join(' ') || '.';

            const profileDetails = await Profile.create({
                gender: null, dateOfBirth: null, about: null, contactNumber: null,
            });

            // generate a random password for Firebase users (they won't use it)
            const randomPassword = await bcrypt.hash(uid + process.env.JWT_SECRET, 10);

            user = await User.create({
                firstName: fName,
                lastName: lName,
                email,
                password: randomPassword,
                accountType: accountType || 'Student',
                approved: true,
                active: true,
                additionalDetails: profileDetails._id,
                image: picture || `https://api.dicebear.com/5.x/initials/svg?seed=${fName} ${lName}`,
            });

            user = await User.findById(user._id).populate('additionalDetails');
        }

        // Generate our JWT
        const payload = { email: user.email, id: user._id, accountType: user.accountType };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        let userObj = user.toObject();
        userObj.token = token;
        userObj.password = undefined;

        const cookieOptions = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        return res.cookie('token', token, cookieOptions).status(200).json({
            success: true,
            user: userObj,
            token,
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Firebase login error:', error.message || error);
        return res.status(401).json({
            success: false,
            message: error.message || 'Invalid or expired Firebase token',
        });
    }
};
