const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
});
const { attachWatchParty } = require('./watchparty');
attachWatchParty(io);

const { cookie } = require('express/lib/response');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const userModel = require('./models/user')
const paymentModel = require('./models/payment')
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors'); //added
const axios = require('axios');
const Razorpay = require('razorpay');

// Replace these with your actual Razorpay keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Must be set in environment variables
});


const mongoose = require('mongoose');
const dburl = process.env.MONGODB_URI;

mongoose.connect(dburl)
    .then(() => {
        console.log("Db Connected");
    })
    .catch((e) => {
        console.log(e);
    });


app.use(cors({  //added
    origin: '*',
    credentials: true,
}));


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Database Part goes here..
app.get('/', (req, res) => {
    res.render('index')
});



app.post('/google-login', async (req, res) => {
    const { idToken } = req.body; // idtoken from user
    if (!idToken) {
        return res.status(400).json({ error: "Token is required" });
    }

    try {
        // Verify id token with Google API
        const response = await axios.get(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );

        const { sub, email, name, picture } = response.data;

        // Check if user already exists
        let user = await userModel.findOne({ email }); // Check if email already exists

        if (!user) {
            // Create a new user if not found
            await userModel.create({
                googleId: sub,
                email,
                name,
                profilepic: picture,
            });

            // Retrieve the newly created user
            user = await userModel.findOne({ email });
        }

        // Create JWT for authentication
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        // Set the token in a cookie
        res.cookie("token", token, { httpOnly: true, secure: true });

        // Send response with user and token
        res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                id: user.email,
                name: user.name,
                email: user.email,
                isPremium: user.ispremium || false,
                profilepic: user.profilepic,
                addons: user.addons || [],
            },
        });
    } catch (error) {
        // console.log(error);
        res.status(400).json({ message: "Google auth failed", error });
    }
});





app.post('/create', async (req, res) => {
    try {
        const { name, email, password, ispremium, } = req.body;
        if (!name || !email || !password) {   // Validate input
            return res.status(400).json({ error: "All fields are required." });
        }
        const existingUser = await userModel.findOne({ email }); // Check Email Already exist.
        if (existingUser) {
            return res.status(401).json({ error: "Email already exists. Please use a different email." });
        }
        const hash = await bcrypt.hash(password, 10);       // Hash the password
        const createdata = await userModel.create({         // Create the user
            name,
            email,
            password: hash,
        });
        const token = jwt.sign({ email: createdata.email }, process.env.JWT_SECRET, { expiresIn: '1h' });    // Generate a JWT token
        res.cookie("token", token, { httpOnly: true, secure: true });       // Set the token in a cookie

        return res.status(200).json({
            message: "Account Created Successfully",
            token,
            user: {
                id: email,
                name,
                email,
                isPremium: false,
                addons: [],
            }
        });

    } catch (error) {
        // console.error("Error during account creation:", error);
        return res.status(500).json({ error: "Failed to Create Account. Please try again later." });
    }
});





app.post('/validate', async (req, res) => {               // validate email password
    let user = await userModel.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, ispremium } = user;
    // Fetch subscription details from paymentModel using email
    const paymentDetails = await paymentModel.findOne({ email: req.body.email }); // Assuming email is stored in paymentModel
    const subscriptionEnd = paymentDetails ? paymentDetails.subscriptionEnd : null;
    const subscriptionStart = paymentDetails ? paymentDetails.subscriptionStart : null;
    bcrypt.compare(req.body.password, user.password, function (err, result) {
        if (err) {
            return res.status(500).json({ message: 'Error while comparing passwords' });
        }
        if (result) {
            let token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);
            res.cookie('token', token);

            return res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    id: email,
                    name,
                    email,
                    isPremium: ispremium || false,
                    subscriptionStart,
                    subscriptionEnd,
                    addons: user.addons || [],
                },
            });

        } else {
            return res.status(401).json({ message: 'Wrong password' });
        }
    });
});






app.post('/userinfo', async (req, res) => {               // validate email password
    let bat = req.body.bat;
    if (bat === "highrisk") {
        let user = await userModel.findOne({
            email: req.body.email
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { name, email, ispremium } = user;
        // Fetch subscription details from paymentModel using email
        const paymentDetails = await paymentModel.findOne({ email: req.body.email }); // Assuming email is stored in paymentModel
        const subscriptionEnd = paymentDetails ? paymentDetails.subscriptionEnd : null;
        const subscriptionStart = paymentDetails ? paymentDetails.subscriptionStart : null;

        if (user) {
            let token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);
            res.cookie('token', token);
            return res.status(200).json({
                message: 'Login data fetched',
                token,
                data: {
                    name,
                    email,
                    subscriptionStart,
                    subscriptionEnd,
                    ispremium,
                    addons: user.addons || [],
                    bat: "highrisk"
                },
            });

        } else {
            return res.status(401).json({ message: 'Wrong password' });
        }
    } else {
        return res.status(401).json({
            message: "bat needed"
        })
    }
});




app.post('/payment', async (req, res) => {
    const { email, paymentId, amount, status, ispremium, validityInDays } = req.body;

    if (!email || !paymentId || !amount || !ispremium || !validityInDays) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // --- SECURE VERIFICATION START ---
        // Fetch payment details from Razorpay to verify its validity
        let razorpayPayment;
        try {
            razorpayPayment = await razorpay.payments.fetch(paymentId);

            // Basic checks: Payment must be captured/authorized and amount must match
            // Razorpay amount is in paise, so we multiply our amount by 100
            if (razorpayPayment.amount !== amount * 100) {
                return res.status(400).json({ error: 'Payment amount mismatch verification failed.' });
            }
            if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
                return res.status(400).json({ error: 'Payment status verification failed.' });
            }
        } catch (error) {
            console.error('Razorpay verification error:', error);
            // If verification fails (e.g. invalid ID or key missing), we reject for security
            // If you don't have the key_secret set, this will fail.
            // For now, logging error but returning 400.
            return res.status(400).json({ error: 'Failed to verify payment with Razorpay.' });
        }
        // --- SECURE VERIFICATION END ---

        // Update the payment model
        await paymentModel.create({
            email,
            paymentId,
            amount,
            status,
            subscriptionStart: new Date(),
            subscriptionEnd: new Date(new Date().setDate(new Date().getDate() + validityInDays)), // Add validity in days
        });

        // Update the user model
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await userModel.updateOne(
            { email },
            {
                $set: {
                    ispremium: true,
                    subscriptionEnd: new Date(new Date().setDate(new Date().getDate() + validityInDays)),
                },
            }
        );

        res.status(200).json({
            message: 'Payment and user model updated successfully',
            subscriptionStart: new Date(),
            subscriptionEnd: new Date(new Date().setDate(new Date().getDate() + validityInDays)),
        });
    } catch (error) {
        console.error('Payment update error:', error);
        res.status(500).json({ error: 'An error occurred while updating models.', details: error.message });
    }
});





const checkSubscriptionValidity = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findOne({ email: decoded.email });

        if (!user || !user.ispremium || new Date(user.subscriptionEnd) < new Date()) {
            return res.status(403).json({ error: 'Your subscription has expired. Please renew.' });
        }

        req.user = user; // Add user info to the request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};







app.get('/protected-route', checkSubscriptionValidity, (req, res) => {
    res.json({ message: 'You have access to this route!', user: req.user });
});


app.get('/login', (req, res) => {
    res.render("login");
})

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
})


const qrSessionModel = require('./models/qrSession');
const crypto = require('crypto');

// Generate QR Session
app.get('/qr/generate', async (req, res) => {
    try {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        const session = await qrSessionModel.create({
            sessionId,
            status: 'pending',
            expiresAt
        });

        res.status(200).json({ sessionId, expiresAt });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR' });
    }
});

// Check Session Status (Polling)
app.get('/qr/status/:sessionId', async (req, res) => {
    try {
        const session = await qrSessionModel.findOne({ sessionId: req.params.sessionId });
        if (!session) {
            return res.status(404).json({ status: 'expired' });
        }

        if (session.status === 'completed') {
            return res.status(200).json({
                status: 'completed',
                token: session.token,
                user: session.user
            });
        }

        res.status(200).json({ status: session.status });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Authorize Session (From Mobile)
app.post('/qr/authorize', async (req, res) => {
    const { sessionId, token, user } = req.body;

    if (!sessionId || !token || !user) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const session = await qrSessionModel.findOneAndUpdate(
            { sessionId, status: 'pending' },
            {
                status: 'completed',
                token,
                user
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found or already processed' });
        }

        res.status(200).json({ message: 'Authorized successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to authorize' });
    }
});

app.post('/sync-addons', async (req, res) => {
    const { email, addons } = req.body;

    if (!email || !Array.isArray(addons)) {
        return res.status(400).json({ error: 'Email and addons array are required.' });
    }

    try {
        const user = await userModel.findOneAndUpdate(
            { email },
            { $set: { addons } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            message: 'Addons synced successfully',
            addons: user.addons
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while syncing addons.' });
    }
});

app.post('/sync-favorites', async (req, res) => {
    const { email, favorites } = req.body;

    if (!email || !Array.isArray(favorites)) {
        return res.status(400).json({ error: 'Email and favorites array are required.' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.ispremium) {
            return res.status(403).json({ error: 'Premium subscription required for syncing.' });
        }

        user.favorites = favorites;
        await user.save();

        res.status(200).json({
            message: 'Favorites synced successfully',
            favorites: user.favorites
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while syncing favorites.' });
    }
});

app.get('/get-favorites/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.ispremium) {
            return res.status(403).json({ error: 'Premium subscription required for syncing.' });
        }

        res.status(200).json({
            favorites: user.favorites || []
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching favorites.' });
    }
});

app.get('/get-addons/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json({
            addons: user.addons || []
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching addons.' });
    }
});

server.listen(3010, () => {
    console.log("listening on port 3010 (HTTP + WebSocket)");
})
